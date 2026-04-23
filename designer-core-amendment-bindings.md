# designer-core — Amendment: Framework Bindings

> Follow-up to the designer-core v1 implementation. Build this AFTER core + cli
> are stable and the API surface is validated through real usage.
>
> Packages:
> - `@burnmark-io/designer-vue` — Vue 3 composable
> - `@burnmark-io/designer-react` — React 18+ hook
>
> Both live in the same `designer-core` monorepo under `packages/vue/` and
> `packages/react/`.

---

## 1. Why This Is Separate

Vue and React bindings make framework reactivity decisions (when to re-render,
how to expose state, how to handle async events) that are difficult to change
after release. Building them after v1 core is stable means:

- The core API surface is validated by the CLI and scripting use cases first
- Binding authors know the real API, not a planned one
- Reactivity wrapping decisions are informed by actual usage patterns
- Selection management (which lives in the binding, NOT in core) can be
  designed with real UI use cases in mind

---

## 2. Vue Composable (`@burnmark-io/designer-vue`)

### 2.1 Package Setup

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

### 2.2 API

```typescript
import { useLabelDesigner } from '@burnmark-io/designer-vue';

const {
  // Core state (reactive refs)
  designer,      // Ref<LabelDesigner> — the raw instance
  document,      // Ref<LabelDocument> — auto-updates on 'change' event
  canUndo,       // Ref<boolean>
  canRedo,       // Ref<boolean>

  // Selection (managed HERE, not in core)
  selection,     // Ref<string[]> — selected object IDs
  select,        // (ids: string[]) => void
  deselect,      // () => void

  // Rendering (reactive, debounced)
  bitmap,        // Ref<LabelBitmap | null> — auto-updates 200ms after change
  planes,        // Ref<Map<string, LabelBitmap> | null> — for multi-colour
  renderError,   // Ref<Error | null> — last render error

  // Actions (delegate to designer)
  add, update, remove, reorder,
  undo, redo,
  setCanvas,
} = useLabelDesigner({
  canvas: { widthDots: 696, heightDots: 0, dpi: 300 },
  capabilities: SINGLE_COLOR,  // optional — for auto plane rendering
});
```

### 2.3 Implementation Notes

- Wraps `LabelDesigner` events in Vue reactivity using `ref`, `computed`, `watch`
- `document` ref updates via `'change'` event listener
- `bitmap` ref updates via debounced `watchEffect` — 200ms after last change
- `renderError` ref updates via `'error'` event listener
- `selection` is local `ref<string[]>` — NOT from core
- `onUnmounted` cleans up event listeners
- Does NOT call `structuredClone` on document — the ref holds the same object
  core returns. Mutation is documented as unsupported; the composable does not
  enforce it.

### 2.4 Tests

- Vitest with `@vue/test-utils`
- Reactive updates: change document → verify `document` ref updates
- Debounced bitmap: trigger change → verify bitmap updates after 200ms
- Error handling: trigger render failure → verify `renderError` ref
- Selection: select/deselect → verify `selection` ref
- Cleanup: unmount → verify event listeners removed

---

## 3. React Hook (`@burnmark-io/designer-react`)

### 3.1 Package Setup

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

### 3.2 API

```typescript
import { useLabelDesigner } from '@burnmark-io/designer-react';

const {
  designer,      // LabelDesigner instance (stable ref)
  document,      // LabelDocument state
  canUndo,
  canRedo,

  // Selection (managed HERE, not in core)
  selection,     // string[]
  select,        // (ids: string[]) => void
  deselect,      // () => void

  // Rendering
  bitmap,        // LabelBitmap | null
  planes,        // Map<string, LabelBitmap> | null
  renderError,   // Error | null

  // Actions
  add, update, remove, reorder,
  undo, redo,
  setCanvas,
} = useLabelDesigner({
  canvas: { widthDots: 696, heightDots: 0, dpi: 300 },
});
```

### 3.3 Implementation Notes

- `designer` stored in `useRef` — stable across renders
- `document` state via `useState` — updated on `'change'` event
- `bitmap` state via `useState` — updated via debounced effect (200ms)
- `renderError` state via `useState` — updated on `'error'` event
- `selection` is local `useState<string[]>` — NOT from core
- `useEffect` cleanup removes event listeners
- Actions are stable callbacks via `useCallback`

### 3.4 Tests

- Vitest with `@testing-library/react`
- State updates: change document → verify re-render
- Debounced bitmap: trigger change → advance timers → verify bitmap
- Error handling: trigger render failure → verify renderError
- Selection: select/deselect → verify state
- Cleanup: unmount → verify event listeners removed

---

## 4. Implementation Sequence

```
1. @burnmark-io/designer-vue
   - package.json + README.md
   - useLabelDesigner composable with selection management
   - Tests
   - Gate: typecheck + lint + test + build

2. @burnmark-io/designer-react
   - package.json + README.md
   - useLabelDesigner hook with selection management
   - Tests
   - Gate: typecheck + lint + test + build

3. Update root README with binding install examples

4. Changeset + publish
```

Both bindings can be built in parallel if desired.
