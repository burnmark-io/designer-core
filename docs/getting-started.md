# Getting started

Three ways to use designer-core: as a Node.js library, through the CLI, or
embedded in a browser application. Each path below is self-contained —
pick the one that matches your setup.

If you're embedding the designer into a Vue or React application, also see
[Embedding → Vue](/embedding/vue) or [Embedding → React](/embedding/react).

## Path 1 — Node.js script

```bash
pnpm add @burnmark-io/designer-core @napi-rs/canvas
```

`@napi-rs/canvas` is an optional peer dependency. Install it only on
Node.js — in the browser, designer-core uses the built-in
`OffscreenCanvas` and the peer is never resolved.

Build a document in code, render it, and write a PNG to disk:

```ts
import { writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { LabelDesigner, exportPng } from '@burnmark-io/designer-core';

const designer = new LabelDesigner({
  canvas: { widthDots: 696, heightDots: 0, dpi: 300 },
});

designer.add({
  type: 'text',
  x: 20, y: 20, width: 656, height: 60,
  rotation: 0, opacity: 1, locked: false, visible: true,
  color: '#000000',
  content: 'Order #{{order_id}} — {{name}}',
  fontFamily: 'Burnmark Sans',
  fontSize: 36, fontWeight: 'bold', fontStyle: 'normal',
  textAlign: 'left', verticalAlign: 'top',
  letterSpacing: 0, lineHeight: 1.2,
  invert: false, wrap: true, autoHeight: false,
});

designer.add({
  type: 'barcode',
  x: 20, y: 100, width: 240, height: 80,
  rotation: 0, opacity: 1, locked: false, visible: true,
  color: '#000000',
  format: 'qrcode',
  data: 'https://example.com/orders/{{order_id}}',
  options: { eclevel: 'M' },
});

const blob = await exportPng(designer.document, {
  variables: { order_id: '12345', name: 'Mannes' },
});
await writeFile('preview.png', Buffer.from(await blob.arrayBuffer()));
```

Expected output: a file `preview.png` (696 × ~190 px) with the text and
a QR code linking to the order URL. The continuous-height canvas
(`heightDots: 0`) auto-crops to content.

### Render a CSV batch

```ts
import { readFile } from 'node:fs/promises';
import {
  LabelDesigner,
  parseCsv,
  renderBatch,
} from '@burnmark-io/designer-core';

const designer = new LabelDesigner({
  canvas: { widthDots: 696, heightDots: 200, dpi: 300 },
});
// …add text/barcode objects referencing `{{name}}`, `{{order_id}}`, etc…

const csvText = await readFile('orders.csv', 'utf-8');
const csv = await parseCsv(csvText);

for await (const result of renderBatch(designer, csv.rows)) {
  const plane = result.planes.get('black');
  if (!plane) continue;
  // `plane` is a 1bpp LabelBitmap — hand it to your printer driver, save
  // it to disk, etc. Each iteration is memory-cheap: the previous bitmap
  // is eligible for GC once the loop advances.
}
```

### Load a `.label` file from disk

```ts
import { readFile } from 'node:fs/promises';
import { LabelDesigner } from '@burnmark-io/designer-core';

const json = await readFile('my-label.label', 'utf-8');
const designer = new LabelDesigner();
designer.fromJSON(json);
```

## Path 2 — CLI

Install the CLI globally, or use it via `pnpm dlx`:

```bash
pnpm add -g burnmark-cli
# or
pnpm dlx burnmark-cli <command>
```

Install any printer drivers you want to use alongside the CLI. Drivers
are optional peer dependencies — the CLI only loads what's present:

```bash
pnpm add -g @thermal-label/brother-ql-node
```

Create a `my-label.label` file (JSON — see the [.label format](/reference/label-format)
reference for the full schema):

```json
{
  "id": "example-label-1",
  "version": 1,
  "name": "Hello",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "canvas": {
    "widthDots": 696, "heightDots": 0, "dpi": 300,
    "margins": { "top": 10, "right": 10, "bottom": 10, "left": 10 },
    "background": "#ffffff",
    "grid": { "enabled": false, "spacingDots": 10 }
  },
  "objects": [
    {
      "id": "t1",
      "type": "text",
      "x": 20, "y": 20, "width": 656, "height": 60,
      "rotation": 0, "opacity": 1, "locked": false, "visible": true,
      "color": "#000000",
      "content": "Hello {{name}}",
      "fontFamily": "Burnmark Sans",
      "fontSize": 40,
      "fontWeight": "bold", "fontStyle": "normal",
      "textAlign": "left", "verticalAlign": "top",
      "letterSpacing": 0, "lineHeight": 1.2,
      "invert": false, "wrap": true, "autoHeight": false
    }
  ],
  "metadata": {}
}
```

Render to PNG:

```bash
burnmark render --template my-label.label --var name="Mannes" --output preview.png
```

Render to a multi-page PDF from a CSV (one page per row):

```bash
burnmark render --template my-label.label --csv people.csv --output preview.pdf
```

Render to a sticker sheet (PDF) using a built-in sheet template:

```bash
burnmark render --template my-label.label --sheet avery-l7160 --csv skus.csv --output sheet.pdf
```

Validate that a CSV has every variable the label expects, before a big batch:

```bash
burnmark validate --template my-label.label --csv people.csv
```

Print — requires a `@thermal-label/*` driver to be installed:

```bash
burnmark print --template my-label.label --var name="Mannes" --printer usb://brother-ql
```

Show which drivers are installed and which sheet templates are built in:

```bash
burnmark list-printers
burnmark list-sheets
```

See the [CLI guide](/guide/cli) for the full flags table and scripting
recipes.

## Path 3 — Browser

In a Vite / webpack / Rollup / ESM-any app, install `@burnmark-io/designer-core`
and use it directly. `OffscreenCanvas` is the only prerequisite — no
`@napi-rs/canvas` is needed in the browser:

```ts
import { LabelDesigner, exportPng } from '@burnmark-io/designer-core';

const designer = new LabelDesigner({
  canvas: { widthDots: 696, heightDots: 0, dpi: 300 },
});

designer.add({
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

const blob = await exportPng(designer.document, {
  variables: { name: 'Mannes' },
});
const url = URL.createObjectURL(blob);

const img = document.querySelector<HTMLImageElement>('#preview');
if (img) img.src = url;
```

Trigger a download:

```ts
const a = document.createElement('a');
a.href = url;
a.download = 'preview.png';
a.click();
URL.revokeObjectURL(url);
```

### Browser requirements

`OffscreenCanvas` is used internally for rendering and PNG export.
Minimum versions: Safari 16.4+, Chrome 69+, Firefox 105+. See the
[FAQ](/reference/faq#offscreencanvas-is-not-defined) if you hit
`OffscreenCanvas is not defined`.

If you're rendering in a Node.js-style server-side environment inside a
browser codebase (for example, Next.js server components), designer-core
will try to dynamically import `@napi-rs/canvas` for rendering. Add it to
your server-side dependencies or gate the render call behind a
`typeof window !== 'undefined'` check.

## What's next

- [Colour model](/guide/colour-model) — the most important conceptual
  page. Explains how CSS colours become printer planes.
- [Document model](/guide/document-model) — the shape of a label, its
  objects, and the `.label` file format.
- [Template engine](/guide/template-engine) — placeholders and CSV batch,
  with a full Christmas-card address-label walkthrough.
- [Export](/guide/export) — PNG, PDF, sheet tiling, and `.zip` bundles.
- [Embedding → Vue](/embedding/vue) or [Embedding → React](/embedding/react)
  if you're adding a designer UI to an app.
