# @burnmark-io/designer-vue

Vue 3 composable for [`@burnmark-io/designer-core`](https://burnmark-io.github.io/designer-core/) — the headless label design engine behind [burnmark.io](https://burnmark.io).

Wraps a `LabelDesigner` instance in reactive state, manages a debounced render loop with stale-result cancellation, exposes selection state, and re-exports the core actions.

## Install

```sh
pnpm add @burnmark-io/designer-vue @burnmark-io/designer-core vue
```

`vue` (>=3.3) and `@burnmark-io/designer-core` are peer dependencies.

## Quick start

```vue
<script setup lang="ts">
import { useLabelDesigner } from '@burnmark-io/designer-vue';

const { document, bitmap, isRendering, canUndo, canRedo, add, undo, redo } = useLabelDesigner({
  canvas: { widthDots: 696, heightDots: 0, dpi: 300 },
});

function addHello() {
  add({
    type: 'text',
    x: 10,
    y: 10,
    width: 200,
    height: 40,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    color: '#000000',
    content: 'Hello',
    fontFamily: 'Burnmark Sans',
    fontSize: 20,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    verticalAlign: 'top',
    letterSpacing: 0,
    lineHeight: 1.2,
    invert: false,
    wrap: false,
    autoHeight: false,
  });
}
</script>

<template>
  <button @click="addHello">Add text</button>
  <button :disabled="!canUndo" @click="undo">Undo</button>
  <button :disabled="!canRedo" @click="redo">Redo</button>
  <p v-if="isRendering">rendering…</p>
  <p>{{ document.objects.length }} objects</p>
</template>
```

## What you get back

| name                  | type                                           | description                                             |
| --------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| `designer`            | `LabelDesigner`                                | Raw instance — escape hatch                             |
| `document`            | `ShallowRef<LabelDocument>`                    | Reactive document. Updates on every core `change` event |
| `canUndo` / `canRedo` | `Ref<boolean>`                                 | History state                                           |
| `bitmap`              | `ShallowRef<LabelBitmap \| null>`              | Latest render (debounced 200ms)                         |
| `planes`              | `ShallowRef<Map<string, LabelBitmap> \| null>` | Multi-plane render when `capabilities` set              |
| `isRendering`         | `Ref<boolean>`                                 | True while a render is in flight                        |
| `renderWarning`       | `ShallowRef<RenderWarning \| null>`            | Non-fatal warning from the core render pipeline         |
| `renderError`         | `ShallowRef<Error \| null>`                    | Render failure                                          |
| `selection`           | `Ref<string[]>`                                | Selected object IDs — auto-pruned on remove             |
| `select` / `deselect` | `(ids) => void` / `() => void`                 | Selection actions                                       |

Plus the full designer action surface: `add`, `update`, `remove`, `reorder`, `get`, `getAll`, `setCanvas`, `undo`, `redo`, `clearHistory`, `loadDocument`, `newDocument`, `toJSON`, `fromJSON`, `getPlaceholders`, `applyVariables`, `render` (force immediate), `exportPng`, `exportPdf`, `exportSheet`, `exportBundled`.

## Options

```ts
useLabelDesigner({
  canvas?: Partial<CanvasConfig>;            // when binding constructs the designer
  name?: string;
  designer?: LabelDesigner;                  // wrap an externally-owned instance
  capabilities?: PrinterCapabilities;        // switches render to multi-plane mode
  renderDebounceMs?: number;                 // default 200
  renderOnMount?: boolean;                   // default true — initial bitmap without user action
  maxHistoryDepth?: number;
  assetLoader?: AssetLoader;
});
```

## Notes

- `document` is a `shallowRef`. Core mutates the document in place — the composable replaces the ref on every `change` event to force reactivity. Do not deeply watch the document object tree; watch `document` itself.
- Renders are debounced and cancellable. If a newer change arrives while a render is in flight, the stale result is discarded via a generation counter.
- `exportBundled()` returns `{ blob, missing }` — the list of asset keys the bundler could not resolve, mirroring the core contract.
- All event listeners and pending timers are cleaned up via `onScopeDispose`, which fires on component unmount or manual `effectScope().stop()`.

## License

MIT
