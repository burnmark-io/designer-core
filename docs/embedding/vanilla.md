# Embedding — vanilla JS/TS

`LabelDesigner` is framework-agnostic. If you're writing a plain
TypeScript application, an Electron tool, or a script that embeds the
designer into something that isn't Vue or React, this is the path.

Selection state, preview rendering, and the live document feed are all
yours to wire up — this page shows the pattern.

If you are using Vue or React, reach for the bindings instead:
[Embedding → Vue](/embedding/vue), [Embedding → React](/embedding/react).

## Import and construct

```ts
import { LabelDesigner } from '@burnmark-io/designer-core';

const designer = new LabelDesigner({
  canvas: { widthDots: 696, heightDots: 0, dpi: 300 },
  name: 'Untitled label',
  maxHistoryDepth: 100,
});
```

The `LabelDesigner` owns the document, history, and asset loader.
Construct it once per open-editor instance; dispose by dropping all
references (it has no explicit `destroy()` — no background timers,
no global registrations).

## Add objects programmatically

```ts
const textId = designer.add({
  type: 'text',
  x: 20, y: 20, width: 656, height: 60,
  rotation: 0, opacity: 1, locked: false, visible: true,
  color: '#000000',
  content: 'Hello {{name}}',
  fontFamily: 'Burnmark Sans',
  fontSize: 40, fontWeight: 'bold', fontStyle: 'normal',
  textAlign: 'left', verticalAlign: 'top',
  letterSpacing: 0, lineHeight: 1.2,
  invert: false, wrap: true, autoHeight: false,
});
```

`add` returns the assigned ID. Use it for subsequent `update` /
`remove` / `reorder` calls:

```ts
designer.update(textId, { color: '#ff0000', fontSize: 48 });
designer.reorder(textId, 'top');
designer.remove(textId);
```

## Subscribe to events

```ts
const offChange = designer.on('change', () => {
  // Fired after every add/update/remove/setCanvas/loadDocument/undo/redo.
  redrawPreview();
});

const offHistory = designer.on('historyChange', () => {
  document.querySelector<HTMLButtonElement>('#undo')!.disabled = !designer.canUndo;
  document.querySelector<HTMLButtonElement>('#redo')!.disabled = !designer.canRedo;
});

const offError = designer.on('error', payload => {
  // Either an Error (render crash) or a RenderWarning ({ code, message, objectId? }).
  console.warn(payload);
});

// Detach when the editor closes:
offChange();
offHistory();
offError();
```

Every mutation emits both `'change'` and `'historyChange'`. The render
pipeline also emits `'render'` on successful completion — useful for
toggling a "rendering…" spinner.

## Render a preview onto a `<canvas>`

```ts
async function drawPreview(canvas: HTMLCanvasElement, variables: Record<string, string>) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const image = await designer.render(variables);
  canvas.width = image.width;
  canvas.height = image.height;
  const data = image.data instanceof Uint8ClampedArray
    ? image.data
    : new Uint8ClampedArray(image.data);
  ctx.putImageData(new ImageData(data, image.width, image.height), 0, 0);
}

designer.on('change', () => {
  drawPreview(previewCanvas, { name: 'World' });
});
```

`designer.render()` returns raw RGBA (`RawImageData`). For a 1bpp
thermal preview:

```ts
const bitmap = await designer.renderToBitmap();
// { widthPx, heightPx, data: Uint8Array } — packed 1bpp, MSB-first per byte
```

## Handle fonts

```ts
import { registerFont } from '@burnmark-io/designer-core';

await registerFont('Acme Display', '/fonts/acme-display.woff2');
```

Browser: uses the Font Loading API. Node.js: uses
`@napi-rs/canvas`'s GlobalFonts. See [Fonts](/guide/fonts) for the
full behaviour including fallbacks and OFL licensing.

## Handle assets

Images are stored by `assetKey`, not inlined. Core's default loader is
in-memory — fine for editor sessions, not durable:

```ts
import { LabelDesigner, InMemoryAssetLoader } from '@burnmark-io/designer-core';

const loader = new InMemoryAssetLoader();
const designer = new LabelDesigner({ assetLoader: loader });

async function addImage(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const assetKey = await loader.store(bytes);

  designer.add({
    type: 'image',
    x: 20, y: 20, width: 200, height: 200,
    rotation: 0, opacity: 1, locked: false, visible: true,
    color: '#000000',
    assetKey,
    fit: 'contain',
    threshold: 128,
    dither: true,
    invert: false,
  });
}
```

For persistence across sessions, implement the `AssetLoader` interface
against IndexedDB, the filesystem, S3, or whatever backing store fits
your application. The same instance should be passed to
`exportBundled(doc, loader)` when you want to export a ZIP with all
assets inline.

## Full working example — HTML + TypeScript

The minimum to put a live editor on the page:

```html
<!doctype html>
<html lang="en">
  <head><title>Label designer demo</title></head>
  <body>
    <canvas id="preview" style="border:1px solid #ccc; max-width: 100%"></canvas>
    <div>
      <label>Name: <input id="name" value="Piet Paddestoel" /></label>
      <button id="undo" disabled>Undo</button>
      <button id="redo" disabled>Redo</button>
    </div>
    <script type="module" src="./editor.ts"></script>
  </body>
</html>
```

```ts
// editor.ts
import { LabelDesigner } from '@burnmark-io/designer-core';

const designer = new LabelDesigner({
  canvas: { widthDots: 696, heightDots: 0, dpi: 300 },
});

const textId = designer.add({
  type: 'text',
  x: 20, y: 20, width: 656, height: 60,
  rotation: 0, opacity: 1, locked: false, visible: true,
  color: '#000000',
  content: 'Hello {{name}}',
  fontFamily: 'Burnmark Sans',
  fontSize: 40, fontWeight: 'bold', fontStyle: 'normal',
  textAlign: 'left', verticalAlign: 'top',
  letterSpacing: 0, lineHeight: 1.2,
  invert: false, wrap: true, autoHeight: false,
});

const preview = document.querySelector<HTMLCanvasElement>('#preview')!;
const nameInput = document.querySelector<HTMLInputElement>('#name')!;
const undoBtn = document.querySelector<HTMLButtonElement>('#undo')!;
const redoBtn = document.querySelector<HTMLButtonElement>('#redo')!;

async function drawPreview() {
  const image = await designer.render({ name: nameInput.value });
  preview.width = image.width;
  preview.height = image.height;
  const ctx = preview.getContext('2d')!;
  const data = image.data instanceof Uint8ClampedArray
    ? image.data
    : new Uint8ClampedArray(image.data);
  ctx.putImageData(new ImageData(data, image.width, image.height), 0, 0);
}

nameInput.addEventListener('input', () => {
  void drawPreview();
});

designer.on('historyChange', () => {
  undoBtn.disabled = !designer.canUndo;
  redoBtn.disabled = !designer.canRedo;
});

undoBtn.addEventListener('click', () => designer.undo());
redoBtn.addEventListener('click', () => designer.redo());

// Simple live editing of the text object via a right-click menu would go
// here — omitted for brevity. See `embedding/vue.md` or
// `embedding/react.md` for a more complete properties-panel example.

await drawPreview();
```

For production UIs you almost certainly want a canvas library like
[Konva](https://konvajs.org/) for interactive handles, guides, and
multi-object selection. The Vue and React bindings pages show that
pattern end-to-end.
