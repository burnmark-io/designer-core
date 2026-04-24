# Embedding — React

`@burnmark-io/designer-react` wraps `LabelDesigner` in a React 18+
hook. It mirrors the Vue composable's scope — reactive state,
debounced bitmap preview, selection management — adapted to React's
re-render model with a version-counter pattern so in-place mutations
to the document still trigger UI updates.

```bash
pnpm add @burnmark-io/designer-react @burnmark-io/designer-core
pnpm add -D react@^18.0.0 react-dom@^18.0.0
```

The core package and React 18+ are peer dependencies.

## `useLabelDesigner(options?)`

```tsx
import { useLabelDesigner } from '@burnmark-io/designer-react';
import { TWO_COLOR_BLACK_RED } from '@burnmark-io/designer-core';

function LabelEditor() {
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
    capabilities: TWO_COLOR_BLACK_RED,
    renderDebounceMs: 200,
    renderOnMount: true,
  });

  /* …JSX… */
}
```

Same options surface as the Vue composable — see
[Embedding → Vue](/embedding/vue#options) for the full table.

### Returned state

Unlike the Vue version, which uses `Ref`/`ShallowRef`, everything
here is a plain React value. `document`, `bitmap`, and `planes` are
updated via state setters whenever the underlying designer fires
`'change'`, and the surrounding component re-renders as a result.

| Value                 | Type                               |
| --------------------- | ---------------------------------- |
| `document`            | `LabelDocument`                    |
| `canUndo` / `canRedo` | `boolean`                          |
| `isRendering`         | `boolean`                          |
| `bitmap`              | `LabelBitmap \| null`              |
| `planes`              | `Map<string, LabelBitmap> \| null` |
| `renderWarning`       | `RenderWarning \| null`            |
| `renderError`         | `Error \| null`                    |
| `selection`           | `string[]`                         |

Actions are stable (`useCallback`-wrapped, stable across renders), so
you can pass them to memoised child components without invalidating
their `React.memo` checks.

## StrictMode safety

React 18's `<StrictMode>` intentionally double-invokes effects in
development to surface subscription and cleanup bugs. The hook is
StrictMode-safe:

- The `LabelDesigner` instance is created once per hook instance via
  `useRef(...).current ??= …`, so the first StrictMode dry-run doesn't
  produce a second designer.
- The event subscriptions are set up in a `useEffect` whose cleanup
  unsubscribes — if StrictMode runs the effect twice, the first run's
  cleanup fires and the second run creates a fresh subscription.
  There's never a double-fire.
- The debounce timer is cleared in cleanup.

If you see double renders in development, that's StrictMode doing its
job on your own code, not the hook — disable StrictMode temporarily
to confirm or leave it on for the bug-finding value.

## SSR safety

The hook is safe under SSR (Next.js server components, Remix loaders
that happen to bundle UI files):

- Constructing `LabelDesigner` doesn't touch `window`, `document`, or
  canvas — those APIs are only reached at render-call time, which
  happens inside `useEffect`, which doesn't run on the server.
- The first render on the server sees `bitmap: null`, `planes: null`,
  `isRendering: false`. Your component should handle those cases —
  typically by showing a placeholder or spinner.

If you have a server-only code path that calls `render()` or
`exportPng()` directly, install `@napi-rs/canvas` as a dependency on
the server runtime.

## Selection management

Selection is owned by the hook, not core. IDs auto-prune when the
referenced objects are removed:

```tsx
const { selection, select, remove, add } = useLabelDesigner();

const newId = add({
  /* …TextObject… */
});
select([newId]);
// selection is [newId]

remove(newId);
// selection is [] on the next render
```

`select(ids)` replaces — pass an array to multi-select.

## Debounced preview

Every mutation schedules a render after 200 ms. The hook uses a
generation counter so a late-returning render from a superseded call
is silently dropped. `isRendering` is a boolean; wire it to a spinner.

Use `render()` (returned from the hook) to force a render immediately:

```tsx
async function onFileOpen(file: File) {
  const text = await file.text();
  fromJSON(text);
  await render(); // bypass debounce — show the loaded file immediately
}
```

## Error and warning handling

```tsx
{
  renderError && <div className="error">Render failed: {renderError.message}</div>;
}
{
  renderWarning && (
    <div className="warning">
      {renderWarning.code}: {renderWarning.message}
    </div>
  );
}
```

- `renderError` holds the last thrown render error. The previous
  bitmap stays visible.
- `renderWarning` holds the last non-fatal render warning. Cleared at
  the start of each render.

## Complete example — canvas preview + controls

```tsx
import { useCallback, useEffect, useRef } from 'react';
import { useLabelDesigner } from '@burnmark-io/designer-react';

export function LabelEditor() {
  const {
    document,
    bitmap,
    isRendering,
    renderError,
    renderWarning,
    selection,
    select,
    add,
    update,
    remove,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useLabelDesigner({
    canvas: { widthDots: 696, heightDots: 0, dpi: 300 },
  });

  const previewRef = useRef<HTMLCanvasElement>(null);

  // Draw the 1bpp bitmap onto the preview canvas whenever it updates.
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !bitmap) return;
    canvas.width = bitmap.widthPx;
    canvas.height = bitmap.heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rowBytes = Math.ceil(bitmap.widthPx / 8);
    const rgba = new Uint8ClampedArray(bitmap.widthPx * bitmap.heightPx * 4);
    for (let y = 0; y < bitmap.heightPx; y++) {
      for (let x = 0; x < bitmap.widthPx; x++) {
        const byte = bitmap.data[y * rowBytes + (x >> 3)] ?? 0;
        const bit = (byte >> (7 - (x % 8))) & 1;
        const v = bit ? 0 : 255;
        const i = (y * bitmap.widthPx + x) * 4;
        rgba[i] = v;
        rgba[i + 1] = v;
        rgba[i + 2] = v;
        rgba[i + 3] = 255;
      }
    }
    ctx.putImageData(new ImageData(rgba, bitmap.widthPx, bitmap.heightPx), 0, 0);
  }, [bitmap]);

  const addText = useCallback(() => {
    const id = add({
      type: 'text',
      x: 20,
      y: 20,
      width: 400,
      height: 60,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      color: '#000000',
      content: 'New text',
      fontFamily: 'Burnmark Sans',
      fontSize: 32,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
      verticalAlign: 'top',
      letterSpacing: 0,
      lineHeight: 1.2,
      invert: false,
      wrap: true,
      autoHeight: false,
    });
    select([id]);
  }, [add, select]);

  const selectedId = selection[0];
  const selected = selectedId ? document.objects.find(o => o.id === selectedId) : undefined;

  return (
    <div className="editor">
      <header>
        <button onClick={undo} disabled={!canUndo}>
          Undo
        </button>
        <button onClick={redo} disabled={!canRedo}>
          Redo
        </button>
        <button onClick={addText}>+ Text</button>
        {isRendering && <span>Rendering…</span>}
        {renderError && <span className="err">Error: {renderError.message}</span>}
        {!renderError && renderWarning && (
          <span className="warn">
            {renderWarning.code}: {renderWarning.message}
          </span>
        )}
      </header>

      <main>
        <canvas ref={previewRef} style={{ border: '1px solid #ccc' }} />
      </main>

      <aside>
        <h3>Objects</h3>
        <ul>
          {document.objects.map(o => (
            <li key={o.id} className={selection.includes(o.id) ? 'selected' : ''}>
              <button onClick={() => select([o.id])}>
                {o.type} — {o.id}
              </button>
              <button onClick={() => remove(o.id)} aria-label="Remove">
                ×
              </button>
            </li>
          ))}
        </ul>

        {selected && (
          <>
            <h3>Properties</h3>
            <label>
              Colour:
              <input
                type="color"
                value={selected.color}
                onChange={e => update(selected.id, { color: e.target.value })}
              />
            </label>
          </>
        )}
      </aside>
    </div>
  );
}
```

In production, replace the bitmap-upscale loop in the `useEffect`
with a canvas library that supports interactive handles —
[react-konva](https://konvajs.org/docs/react/index.html) is a
straightforward fit and matches the design the Vue page assumes.
