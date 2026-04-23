# @burnmark-io/designer-react

React 18+ hook for [`@burnmark-io/designer-core`](https://burnmark-io.github.io/designer-core/) — the headless label design engine behind [burnmark.io](https://burnmark.io).

Wraps a `LabelDesigner` instance with reactive state, a debounced render loop with stale-result cancellation, selection management, and the full designer action surface.

## Install

```sh
pnpm add @burnmark-io/designer-react @burnmark-io/designer-core react
```

`react` (>=18) and `@burnmark-io/designer-core` are peer dependencies.

## Quick start

```tsx
import { useLabelDesigner } from '@burnmark-io/designer-react';

export function Editor() {
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

  return (
    <div>
      <button onClick={addHello}>Add text</button>
      <button disabled={!canUndo} onClick={undo}>
        Undo
      </button>
      <button disabled={!canRedo} onClick={redo}>
        Redo
      </button>
      {isRendering && <p>rendering…</p>}
      <p>{document.objects.length} objects</p>
    </div>
  );
}
```

## What you get back

| name                  | type                               | description                                     |
| --------------------- | ---------------------------------- | ----------------------------------------------- |
| `designer`            | `LabelDesigner`                    | Raw instance — escape hatch                     |
| `document`            | `LabelDocument`                    | Current document. Re-reads on every render      |
| `canUndo` / `canRedo` | `boolean`                          | History state                                   |
| `bitmap`              | `LabelBitmap \| null`              | Latest render (debounced 200ms)                 |
| `planes`              | `Map<string, LabelBitmap> \| null` | Multi-plane render when `capabilities` is set   |
| `isRendering`         | `boolean`                          | True while a render is in flight                |
| `renderWarning`       | `RenderWarning \| null`            | Non-fatal warning from the core render pipeline |
| `renderError`         | `Error \| null`                    | Render failure                                  |
| `selection`           | `string[]`                         | Selected object IDs — auto-pruned on remove     |
| `select` / `deselect` | `(ids) => void` / `() => void`     | Selection actions                               |

Plus the full designer action surface: `add`, `update`, `remove`, `reorder`, `get`, `getAll`, `setCanvas`, `undo`, `redo`, `clearHistory`, `loadDocument`, `newDocument`, `toJSON`, `fromJSON`, `getPlaceholders`, `applyVariables`, `render` (force immediate), `exportPng`, `exportPdf`, `exportSheet`, `exportBundled`.

## Options

```ts
useLabelDesigner({
  canvas?: Partial<CanvasConfig>;            // when hook constructs the designer
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

- The designer is constructed once and cached in a ref — subsequent re-renders with a new options object do **not** re-initialise it. If you need to reset state, call `loadDocument`, `newDocument`, or `fromJSON`.
- Core mutates the document object in place. The hook forces re-renders via a version counter so in-place mutations are visible.
- `renderBitmap`/`renderPlanes` are cancellable via a generation counter — stale async results from superseded renders are discarded silently.
- **StrictMode safe:** the effect's subscribe/cleanup cycle is idempotent.
- **SSR safe:** no browser APIs are touched at construction; render scheduling only starts inside `useEffect`, which does not run on the server.
- `exportBundled()` returns `{ blob, missing }` — the list of asset keys the bundler could not resolve, mirroring the core contract.

## License

MIT
