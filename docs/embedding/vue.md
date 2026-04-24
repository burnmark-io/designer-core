# Embedding — Vue

`@burnmark-io/designer-vue` wraps `LabelDesigner` in a Vue 3
composable with reactive state and a debounced bitmap preview. It
owns the plumbing that every Vue integration was going to reinvent:
`shallowRef` + `triggerRef` for in-place document mutations,
generation-counter cancellation of stale renders, selection
auto-pruning when referenced objects are removed, and correct cleanup
on scope dispose.

```bash
pnpm add @burnmark-io/designer-vue @burnmark-io/designer-core
pnpm add -D vue@^3.4.0
```

The core package is a peer dependency of the Vue binding; Vue 3.3+ is
the minimum supported version.

## `useLabelDesigner(options?)`

```vue
<script setup lang="ts">
import { useLabelDesigner } from '@burnmark-io/designer-vue';
import { TWO_COLOR_BLACK_RED } from '@burnmark-io/designer-core';

const {
  designer,
  document,
  canUndo,
  canRedo,
  isRendering,
  bitmap,
  planes,
  renderWarning,
  renderError,
  selection,
  select,
  deselect,
  add,
  update,
  remove,
  reorder,
  setCanvas,
  undo,
  redo,
  clearHistory,
  getPlaceholders,
  applyVariables,
  render,
  toJSON,
  fromJSON,
  loadDocument,
  newDocument,
  exportPng,
  exportPdf,
  exportSheet,
  exportBundled,
} = useLabelDesigner({
  canvas: { widthDots: 696, heightDots: 0, dpi: 300 },
  capabilities: TWO_COLOR_BLACK_RED,      // optional; omit for single-colour preview
  renderDebounceMs: 200,                  // default
  renderOnMount: true,                    // default
  maxHistoryDepth: 100,                   // forwarded to LabelDesigner
});
</script>
```

Every returned value is either a Vue `Ref`/`ShallowRef` (reactive) or
a plain function. The `designer` instance itself is returned for
escape-hatch usage — most consumers never need it.

### Options

| Option | Default | Notes |
|---|---|---|
| `canvas` | `undefined` | Partial `CanvasConfig`. Forwarded to `new LabelDesigner()`. |
| `name` | `undefined` | Document name. Forwarded to constructor. |
| `designer` | `undefined` | Bring your own `LabelDesigner`. Skips constructor. |
| `capabilities` | `undefined` | If set, the auto-render uses `renderPlanes(caps)` instead of `renderToBitmap()`. `planes` ref gets populated too. |
| `renderDebounceMs` | `200` | Debounce window for change-triggered re-renders. |
| `renderOnMount` | `true` | Render once when the composable mounts, without waiting for a mutation. |
| `maxHistoryDepth` | `100` | Forwarded to constructor. |
| `assetLoader` | in-memory | Bring your own `AssetLoader` — shared with exports. |

### Returned state

| Ref | Type | What it is |
|---|---|---|
| `document` | `ShallowRef<LabelDocument>` | Swapped identity on `loadDocument`/`newDocument`/`undo`/`redo`; `triggerRef` fires on in-place mutations via `add`/`update`/`remove` so templates react either way. |
| `canUndo` / `canRedo` | `Ref<boolean>` | Driven by the designer's `historyChange` event. |
| `isRendering` | `Ref<boolean>` | True while a render is in flight. |
| `bitmap` | `ShallowRef<LabelBitmap \| null>` | Single-plane output — or the `'black'` plane when multi-colour. |
| `planes` | `ShallowRef<Map<string, LabelBitmap> \| null>` | Only set when `capabilities` is supplied. |
| `renderWarning` | `ShallowRef<RenderWarning \| null>` | Last non-fatal warning (missing font, etc.). Cleared at the start of each render. |
| `renderError` | `ShallowRef<Error \| null>` | Last render exception. Cleared on successful renders. |
| `selection` | `Ref<string[]>` | Selected object IDs. Auto-pruned when objects are removed — see below. |

### Returned actions

| Action | Signature | Notes |
|---|---|---|
| `add` | `(input: LabelObjectInput) => string` | Proxies `designer.add`; returns the new ID. |
| `update` | `(id, patch) => void` | Proxies `designer.update`. |
| `remove` | `(id) => void` | Proxies `designer.remove`. |
| `reorder` | `(id, direction) => void` | Proxies `designer.reorder`. |
| `setCanvas` | `(patch: Partial<CanvasConfig>) => void` | |
| `undo` / `redo` / `clearHistory` | `() => void` | |
| `select` / `deselect` | `(ids[]) => void` / `() => void` | Managed here, not in core. |
| `getPlaceholders` | `() => string[]` | |
| `applyVariables` | `(vars) => LabelDocument` | |
| `render` | `() => Promise<void>` | Force-run the render, bypassing the debounce. |
| `toJSON` / `fromJSON` / `loadDocument` / `newDocument` | — | |
| `exportPng` / `exportPdf` / `exportSheet` / `exportBundled` | — | Return `Blob`, or `{ blob, missing }` for bundled. |

## Selection management

Selection lives in the composable, not in core, because core never
knew about it — selection is UI state. The composable gives you a
reactive `selection: Ref<string[]>` and auto-prunes IDs that no longer
exist in the document:

```vue
<script setup lang="ts">
const { selection, select, deselect, add, remove } = useLabelDesigner();

const id = add({ /* …TextObject… */ });
select([id]);
console.log(selection.value);  // [id]

remove(id);
// selection is auto-pruned on the next `change` event.
console.log(selection.value);  // []
</script>
```

If you're selecting multiple objects, pass the full array — `select`
replaces rather than appends.

## Debounced preview

Every mutation schedules a render after 200 ms (configurable via
`renderDebounceMs`). Back-to-back mutations coalesce into one render.
The composable uses a generation counter so a late-returning render
from a superseded call is discarded — you never see stale bitmaps on
screen.

`isRendering` goes true when a render starts and false when the
*latest* generation finishes. In your UI, wire it to a spinner
overlay on the preview.

Force a render immediately (skipping the debounce) when you need a
bitmap right now — after loading a document, for example:

```ts
loadDocument(fromJSON(fileContents));
await render();
// bitmap.value is fresh
```

## Error and warning handling

Two refs, not one, because they mean different things:

- **`renderError: Error | null`** — the render threw. The previous
  bitmap is still visible (not cleared). Decide whether to show a
  toast, block saves, etc.
- **`renderWarning: RenderWarning | null`** — the render succeeded
  but the pipeline complained (missing font falls back, barcode data
  had a bwip-js nonfatal warning). Cleared at the start of each
  render, set if a new warning arrives.

```vue
<template>
  <div v-if="renderError" class="error">
    Render failed: {{ renderError.message }}
  </div>
  <div v-if="renderWarning" class="warning">
    {{ renderWarning.code }}: {{ renderWarning.message }}
  </div>
</template>
```

## Complete single-file component

This example uses [Konva](https://konvajs.org/) for interactive
handles and a right-panel property editor. The important parts are
the composable calls — the canvas library is incidental.

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useLabelDesigner } from '@burnmark-io/designer-vue';
import { TWO_COLOR_BLACK_RED } from '@burnmark-io/designer-core';

const {
  document,
  bitmap,
  planes,
  isRendering,
  renderError,
  renderWarning,
  selection,
  select,
  deselect,
  add,
  update,
  remove,
  undo, redo, canUndo, canRedo,
} = useLabelDesigner({
  canvas: { widthDots: 696, heightDots: 300, dpi: 300 },
  capabilities: TWO_COLOR_BLACK_RED,
});

const selected = computed(() =>
  selection.value[0]
    ? document.value.objects.find(o => o.id === selection.value[0])
    : undefined,
);

function addText() {
  const id = add({
    type: 'text',
    x: 20, y: 20, width: 400, height: 60,
    rotation: 0, opacity: 1, locked: false, visible: true,
    color: '#000000',
    content: 'New text',
    fontFamily: 'Burnmark Sans',
    fontSize: 32, fontWeight: 'normal', fontStyle: 'normal',
    textAlign: 'left', verticalAlign: 'top',
    letterSpacing: 0, lineHeight: 1.2,
    invert: false, wrap: true, autoHeight: false,
  });
  select([id]);
}

function setColor(value: string) {
  const id = selection.value[0];
  if (id) update(id, { color: value });
}
</script>

<template>
  <div class="editor">
    <header>
      <button :disabled="!canUndo" @click="undo">Undo</button>
      <button :disabled="!canRedo" @click="redo">Redo</button>
      <button @click="addText">+ Text</button>
      <span v-if="isRendering">Rendering…</span>
      <span v-if="renderError" class="err">Error: {{ renderError.message }}</span>
      <span v-else-if="renderWarning" class="warn">
        {{ renderWarning.code }}: {{ renderWarning.message }}
      </span>
    </header>

    <!--
      Preview. In a real app, draw `bitmap` (single-plane) or iterate
      `planes` (multi-plane) onto a Konva Layer. This example shows the
      bitmap as a grayscale preview only.
    -->
    <main>
      <pre v-if="bitmap">{{ bitmap.widthPx }}×{{ bitmap.heightPx }} px</pre>
    </main>

    <aside>
      <h3>Objects</h3>
      <ul>
        <li
          v-for="o in document.objects"
          :key="o.id"
          :class="{ selected: selection.includes(o.id) }"
        >
          <button @click="select([o.id])">{{ o.type }} — {{ o.id }}</button>
          <button @click="remove(o.id)">×</button>
        </li>
      </ul>

      <h3 v-if="selected">Properties</h3>
      <div v-if="selected">
        <label>
          Colour:
          <input
            type="color"
            :value="selected.color"
            @input="setColor(($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>
    </aside>
  </div>
</template>
```

## Two-colour preview

Pass `capabilities` and watch `planes`:

```vue
<script setup lang="ts">
import { useLabelDesigner } from '@burnmark-io/designer-vue';
import { TWO_COLOR_BLACK_RED } from '@burnmark-io/designer-core';

const { planes } = useLabelDesigner({
  canvas: { widthDots: 696, heightDots: 300, dpi: 300 },
  capabilities: TWO_COLOR_BLACK_RED,
});
</script>

<template>
  <div>
    <div v-if="planes">
      Black plane: {{ planes.get('black')?.widthPx }}×{{ planes.get('black')?.heightPx }} px
      <br />
      Red plane:   {{ planes.get('red')?.widthPx }}×{{ planes.get('red')?.heightPx }} px
    </div>
  </div>
</template>
```

For a visual composite, overlay the red plane on the black with a red
tint — same technique as
[Rendering → multi-colour](/guide/rendering#multi-colour-path-renderplanes-capabilities).
