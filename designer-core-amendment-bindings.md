# designer-core — Amendment: Framework Bindings (v2)

> Follow-up to the designer-core v1 implementation. Build this AFTER core + cli
> are stable and the API surface is validated through real usage.
>
> Packages:
> - `@burnmark-io/designer-vue` — Vue 3 composable
> - `@burnmark-io/designer-react` — React 18+ hook
>
> Both live in the `designer-core` monorepo under `packages/vue/` and
> `packages/react/`.
>
> **This revision addresses concrete issues found by inspecting the shipped
> designer-core implementation.** Three blockers and several design decisions
> are resolved below.

---

## 1. Resolved Blockers

### 1.1 Document Identity vs Framework Reactivity

**The problem:** `LabelDesigner.document` returns `this.doc` directly.
`mutate()` mutates it in place — `add`, `update`, `remove` do not replace
the object reference. Only `undo`, `redo`, and `loadDocument` create new
references. This means:

- Vue: `ref.value = sameObject` does not trigger reactivity
- React: `setState(sameObject)` bails out of re-renders

**The fix: `shallowRef` + `triggerRef()` in Vue, version counter in React.**

Both bindings listen to the `'change'` event and force a reactivity update
regardless of whether the object reference changed:

**Vue:**
```typescript
const document = shallowRef(designer.document);

designer.on('change', () => {
  // Same object reference, but triggerRef forces Vue to re-evaluate
  triggerRef(document);
});
```

**React:**
```typescript
const [version, setVersion] = useState(0);
const documentRef = useRef(designer.document);

useEffect(() => {
  const unsub = designer.on('change', () => {
    documentRef.current = designer.document;
    setVersion(v => v + 1);  // force re-render
  });
  return unsub;
}, [designer]);

// Consumers use documentRef.current, re-render triggered by version bump
```

**Do NOT use `structuredClone`.** The document contains asset keys that
reference external blobs — cloning is wasteful and breaks object identity
for downstream comparisons. The version counter / triggerRef approach is
the correct pattern for mutable-in-place state in reactive frameworks.

### 1.2 Error Event Payload Type

**The problem:** core emits `'error'` events with `RenderWarning` objects
(from `onWarning`), not `Error` instances. The v1 amendment typed
`renderError: Ref<Error | null>` which is wrong.

**The fix:** two separate reactive values:

```typescript
// Warning from render pipeline (opacity, missing font fallback, etc.)
renderWarning: Ref<RenderWarning | null>   // Vue
renderWarning: RenderWarning | null        // React

// Actual failure (canvas allocation failed, barcode data invalid, etc.)
renderError: Ref<Error | null>             // Vue
renderError: Error | null                  // React
```

The binding listens to `'error'` events and routes them:
```typescript
designer.on('error', (payload) => {
  if (payload instanceof Error) {
    renderError.value = payload;
  } else {
    renderWarning.value = payload;
  }
});
```

`renderWarning` is cleared at the start of each render cycle.
`renderError` persists until the next successful render.

### 1.3 Render Lifecycle — Debounce, Cancellation, Pending State

**The problem:** core has no "render on change" hook. `render()`,
`renderToBitmap()`, `renderPlanes()` are async methods the caller invokes.
The binding must drive rendering itself, handle cancellation when changes
arrive mid-render, and expose pending state for spinner UI.

**The fix: generation counter + `isRendering` flag.**

```typescript
// Shared logic (both frameworks use the same pattern)
let generation = 0;

async function triggerRender() {
  const thisGeneration = ++generation;
  isRendering.value = true;
  renderWarning.value = null;

  try {
    let result: LabelBitmap | Map<string, LabelBitmap>;

    if (capabilities) {
      result = await designer.renderPlanes(capabilities);
      if (thisGeneration !== generation) return;  // stale — newer change arrived
      planes.value = result as Map<string, LabelBitmap>;
      bitmap.value = result.get('black') ?? null;
    } else {
      result = await designer.renderToBitmap();
      if (thisGeneration !== generation) return;  // stale
      bitmap.value = result as LabelBitmap;
      planes.value = null;
    }

    renderError.value = null;
  } catch (err) {
    if (thisGeneration !== generation) return;
    renderError.value = err instanceof Error ? err : new Error(String(err));
  } finally {
    if (thisGeneration === generation) {
      isRendering.value = false;
    }
  }
}
```

**Debounce:** the `'change'` event handler calls `triggerRender` via a 200ms
debounce. Rapid changes (typing, dragging) accumulate — only the last one
renders.

**Cancellation:** the generation counter ensures stale renders are discarded.
Core has no `AbortController` — the render runs to completion but its result
is silently dropped if a newer generation exists. This is correct for canvas
rendering which is typically fast (<100ms).

**`isRendering` is always exposed** — both bindings surface it for spinner UI.

---

## 2. Design Decisions

### 2.1 Selection on Remove

When a selected object is removed, the binding **auto-prunes** stale IDs
from the selection array:

```typescript
designer.on('change', () => {
  const validIds = new Set(designer.getAll().map(o => o.id));
  selection.value = selection.value.filter(id => validIds.has(id));
  triggerRef(document);  // Vue — or version bump for React
});
```

### 2.2 Render Mode — `bitmap` vs `planes`

The `capabilities` option determines which render method is called:

| `capabilities` | Method called | `bitmap` | `planes` |
|---|---|---|---|
| undefined / omitted | `renderToBitmap()` | `LabelBitmap` | `null` |
| `SINGLE_COLOR` | `renderPlanes()` | first plane | `Map` (1 entry) |
| `TWO_COLOR_BLACK_RED` | `renderPlanes()` | black plane | `Map` (2 entries) |

Both `bitmap` and `planes` are always available. `bitmap` is a convenience
shortcut — it's the black plane (or the only plane for single-colour).

### 2.3 `'render'` Event Usage

Core emits `'render'` after each successful render. The binding uses it to:
1. Set `isRendering = false`
2. Clear `renderWarning`

This provides a clean lifecycle: `change` → `isRendering=true` → render
runs → `'render'` event → `isRendering=false`.

### 2.4 Exposed Surface

The v1 amendment was too narrow. The binding exposes the full working API:

```typescript
// Document lifecycle
loadDocument, newDocument, toJSON, fromJSON,

// Objects
add, update, remove, reorder, get, getAll,

// Canvas
setCanvas,   // (patch: Partial<CanvasConfig>) => void

// History
undo, redo, canUndo, canRedo, clearHistory,

// Templates
getPlaceholders, applyVariables,

// Rendering (auto-managed by binding, but also callable directly)
render, renderToBitmap, renderPlanes,

// Export
exportPng, exportPdf, exportSheet, exportBundled,

// Batch
renderBatch,
```

If a consumer needs something not listed, `designer` (the raw instance) is
exposed as an escape hatch.

### 2.5 External Designer Instance

Both bindings accept an optional pre-existing `LabelDesigner` instance:

```typescript
// Create internally (normal use)
const result = useLabelDesigner({ canvas: { widthDots: 696, ... } });

// Wrap externally-owned instance (shared state, hydration, testing)
const result = useLabelDesigner({ designer: existingDesigner });
```

When `designer` is provided in options, the binding wraps it without
creating a new instance. Useful for:
- Sharing state across components
- Hydrating from saved state
- Testing with a pre-configured designer

### 2.6 Options Initialisation

Options are read **once** on first invocation. Subsequent re-renders with
new options objects do NOT re-initialise:

**Vue:** options read in `setup()` — naturally called once.

**React:** designer stored in `useRef`, initialised on first render only:
```typescript
const designerRef = useRef<LabelDesigner | null>(null);
if (!designerRef.current) {
  designerRef.current = options.designer ?? new LabelDesigner(options);
}
```

---

## 3. Vue Composable (`@burnmark-io/designer-vue`)

### 3.1 Package Setup

```json
{
  "name": "@burnmark-io/designer-vue",
  "description": "Vue 3 composable for the burnmark label design engine",
  "peerDependencies": {
    "vue": ">=3.3.0",
    "@burnmark-io/designer-core": "workspace:*"
  },
  "devDependencies": {
    "vue": "^3.4.0",
    "@burnmark-io/designer-core": "workspace:*",
    "@mbtech-nl/tsconfig": "^1.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "typescript": "~5.5.0",
    "vitest": "^2.0.0"
  }
}
```

Extends `@mbtech-nl/tsconfig/node` — Vue's SFC compiler handles browser
concerns. Build with standard `tsc` since this is a composable (no SFCs).

### 3.2 API

```typescript
import { useLabelDesigner } from '@burnmark-io/designer-vue';
import type { DesignerComposableOptions, DesignerComposableReturn } from '@burnmark-io/designer-vue';

export interface DesignerComposableOptions {
  canvas?: Partial<CanvasConfig>;
  designer?: LabelDesigner;
  capabilities?: PrinterCapabilities;
}

export interface DesignerComposableReturn {
  designer: LabelDesigner;

  // Reactive state
  document: ShallowRef<LabelDocument>;
  canUndo: Ref<boolean>;
  canRedo: Ref<boolean>;
  isRendering: Ref<boolean>;
  bitmap: ShallowRef<LabelBitmap | null>;
  planes: ShallowRef<Map<string, LabelBitmap> | null>;
  renderWarning: Ref<RenderWarning | null>;
  renderError: ShallowRef<Error | null>;

  // Selection (binding-managed)
  selection: Ref<string[]>;
  select: (ids: string[]) => void;
  deselect: () => void;

  // Document lifecycle
  loadDocument: (doc: LabelDocument) => void;
  newDocument: (canvas: Partial<CanvasConfig>) => void;
  toJSON: () => string;
  fromJSON: (json: string) => void;

  // Objects
  add: (object: Omit<LabelObject, 'id'>) => string;
  update: (id: string, patch: Partial<LabelObject>) => void;
  remove: (id: string) => void;
  reorder: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  get: (id: string) => LabelObject | undefined;
  getAll: () => LabelObject[];

  // Canvas
  setCanvas: (patch: Partial<CanvasConfig>) => void;

  // History
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;

  // Templates
  getPlaceholders: () => string[];
  applyVariables: (variables: Record<string, string>) => LabelDocument;

  // Export
  exportPng: (variables?: Record<string, string>, scale?: number) => Promise<Blob>;
  exportPdf: (rows?: Record<string, string>[]) => Promise<Blob>;
  exportSheet: (sheet: SheetTemplate, rows?: Record<string, string>[]) => Promise<Blob>;
  exportBundled: () => Promise<Blob>;
}
```

### 3.3 Implementation Notes

- `document` is `shallowRef` + `triggerRef()` on `'change'` event
- `bitmap` and `planes` are `shallowRef` — updated by debounced render
- Selection auto-prunes on `'change'` (filter against `getAll()` IDs)
- `onUnmounted` cleans up all event listeners
- Debounced render uses `watchEffect` with a 200ms timeout
- Generation counter prevents stale render results from updating state
- `isRendering` transitions: `true` on change debounce trigger, `false`
  on render complete or stale discard

### 3.4 Tests

- Vitest with `@vue/test-utils`
- `shallowRef` reactivity: `add()` → verify `document` triggers update
- Debounced bitmap: change → advance timers 200ms → verify bitmap updates
- Stale render discard: change twice rapidly → only latest result applied
- `isRendering` lifecycle: true during render, false after
- Error routing: `RenderWarning` → `renderWarning`, `Error` → `renderError`
- Selection auto-prune: remove selected object → verify pruned from selection
- Cleanup: unmount → verify all event listeners removed
- External designer: pass existing instance → verify no new instance created

---

## 4. React Hook (`@burnmark-io/designer-react`)

### 4.1 Package Setup

```json
{
  "name": "@burnmark-io/designer-react",
  "description": "React hook for the burnmark label design engine",
  "peerDependencies": {
    "react": ">=18.0.0",
    "@burnmark-io/designer-core": "workspace:*"
  },
  "devDependencies": {
    "react": "^18.3.0",
    "@burnmark-io/designer-core": "workspace:*",
    "@mbtech-nl/tsconfig": "^1.0.0",
    "@testing-library/react": "^16.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "typescript": "~5.5.0",
    "vitest": "^2.0.0"
  }
}
```

### 4.2 API

Same shape as Vue — all values are plain (not `Ref<>`), re-renders triggered
by version counter.

```typescript
export interface DesignerHookOptions {
  canvas?: Partial<CanvasConfig>;
  designer?: LabelDesigner;
  capabilities?: PrinterCapabilities;
}

export interface DesignerHookReturn {
  designer: LabelDesigner;
  document: LabelDocument;
  canUndo: boolean;
  canRedo: boolean;
  isRendering: boolean;
  bitmap: LabelBitmap | null;
  planes: Map<string, LabelBitmap> | null;
  renderWarning: RenderWarning | null;
  renderError: Error | null;
  selection: string[];
  select: (ids: string[]) => void;
  deselect: () => void;
  // ... all actions same as Vue section 3.2
  loadDocument: (doc: LabelDocument) => void;
  newDocument: (canvas: Partial<CanvasConfig>) => void;
  toJSON: () => string;
  fromJSON: (json: string) => void;
  add: (object: Omit<LabelObject, 'id'>) => string;
  update: (id: string, patch: Partial<LabelObject>) => void;
  remove: (id: string) => void;
  reorder: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  get: (id: string) => LabelObject | undefined;
  getAll: () => LabelObject[];
  setCanvas: (patch: Partial<CanvasConfig>) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  getPlaceholders: () => string[];
  applyVariables: (variables: Record<string, string>) => LabelDocument;
  exportPng: (variables?: Record<string, string>, scale?: number) => Promise<Blob>;
  exportPdf: (rows?: Record<string, string>[]) => Promise<Blob>;
  exportSheet: (sheet: SheetTemplate, rows?: Record<string, string>[]) => Promise<Blob>;
  exportBundled: () => Promise<Blob>;
}
```

### 4.3 Implementation Notes

- Designer stored in `useRef` — initialised once, stable across renders
- Version counter via `useState<number>` — bumped on every `'change'` event
- `useEffect` for event subscription — cleanup returns `unsub` functions
- **StrictMode safe:** effects are idempotent. Double-invoke subscribes
  twice then cleans up the first — second subscription is the live one.
  The generation counter in the render logic is naturally idempotent.
- **SSR safe:** designer construction guarded behind `useRef` null check.
  No browser APIs at import time. Render debounce wrapped in
  `typeof window !== 'undefined'` guard.
- Debounced render: `useEffect` with `setTimeout(200)` + cleanup clears timeout
- Stale render: generation counter, same pattern as section 1.3
- Selection auto-prune: runs in the `'change'` handler
- All action functions stable via `useCallback` — no unnecessary child re-renders

### 4.4 Tests

- Vitest with `@testing-library/react` + `renderHook`
- Version counter: `add()` → verify re-render triggered
- Debounced bitmap: change → `act(() => jest.advanceTimersByTime(200))` → verify
- StrictMode: wrap in `<StrictMode>` → verify no double subscription leaks
- Stale render discard: two rapid changes → only latest applied
- `isRendering` lifecycle: true during render, false after
- Error routing: warning vs error separated correctly
- Selection auto-prune on remove
- Cleanup: unmount → no setState after unmount warnings
- External designer: pass instance → verify reused
- SSR guard: render on server → no `OffscreenCanvas` error

---

## 5. Shared Build / Exports Config

Both packages mirror the core package's build setup:

```json
{
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist", "README.md"],
  "publishConfig": { "access": "public" },
  "sideEffects": false,
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

`tsconfig.json` in each package extends `@mbtech-nl/tsconfig/node` (not
browser — these are library packages consumed by bundlers, not browser apps).

---

## 6. Implementation Sequence

```
1. @burnmark-io/designer-vue
   - package.json + README.md (install, API, quick example)
   - src/index.ts — useLabelDesigner composable
   - src/types.ts — DesignerComposableOptions, DesignerComposableReturn
   - src/__tests__/ — all tests from section 3.4
   - Gate: typecheck + lint + test + build
   - Commit + push

2. @burnmark-io/designer-react
   - package.json + README.md (install, API, quick example)
   - src/index.ts — useLabelDesigner hook
   - src/types.ts — DesignerHookOptions, DesignerHookReturn
   - src/__tests__/ — all tests from section 4.4
   - Gate: typecheck + lint + test + build
   - Commit + push

3. Update root README with binding examples
   - Commit + push

4. Changeset + tag for release
```

Both bindings can be built in parallel if desired — they share no code
and have no dependency on each other.