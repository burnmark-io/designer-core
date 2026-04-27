# Export

designer-core ships four export functions, all of which accept a
`LabelDocument` as their first argument:

```typescript
exportPng(doc, options?)
exportPdf(doc, rows?, options?)
exportSheet(doc, sheet, rows?, options?)
exportBundled(doc, assetLoader?)
```

These are free functions — the `LabelDesigner` instance methods don't
wrap them, because you often want to export a document you've just
loaded from disk without putting it into a designer first. When you
already have a designer, pass `designer.document`:

```ts
import { exportPng, exportPdf, exportSheet, exportBundled } from '@burnmark-io/designer-core';

const blob = await exportPng(designer.document);
```

Every export is **full colour** — the flattening-to-1bpp pipeline only
runs for `renderToBitmap()` / `renderPlanes()` / `flattenForPrinter()`.
A PNG or PDF is meant to be looked at, not sent to a thermal printer.

All four functions return a `Blob` (or, for `exportBundled`, a
`{ blob, missing }` object). In Node.js, convert with
`Buffer.from(await blob.arrayBuffer())`; in the browser, pass directly
to `URL.createObjectURL` or a download anchor.

## `exportPng(doc, options?)`

```ts
const blob = await exportPng(designer.document, {
  variables: { name: 'Piet' },
  scale: 2, // optional — render at 2× the document DPI
  assetLoader: myAssetLoader, // optional — defaults to designer's or an empty in-memory loader
});
```

Options:

- **`variables?: Record<string, string>`** — substituted into
  `{{placeholder}}` tokens before rendering. Equivalent to calling
  `applyVariables(doc, variables)` first, but doesn't mutate the
  document.
- **`scale?: number`** — multiplier for output size. At `scale: 1`
  (default) the PNG matches the document's `canvas.widthDots` ×
  `canvas.heightDots` exactly. At `scale: 2` the output is double,
  using nearest-neighbour resampling (pixel-perfect, not blurry).
- **`assetLoader?: AssetLoader`** — needed if the document references
  `ImageObject`s with `assetKey` values. If you're calling `exportPng`
  on `designer.document`, pass `designer.assetLoader` so image objects
  resolve.
- **`onWarning?: (w: RenderWarning) => void`** — callback for
  non-fatal render warnings (missing fonts, invalid barcode data,
  etc.). Wire this to your logger or swallow silently.
- **`respectOrientation?: boolean`** — defaults to `true`. When the
  document's `canvas.orientation === 'horizontal'`, the bitmap is
  rotated 90° clockwise before encoding so a horizontal label exports
  as a landscape PNG with no caller-side rotation. Pass `false` to
  always emit the canvas at its canonical
  `widthDots × heightDots`. The same flag is honoured by `exportPdf`
  and `exportSheet`.

Node.js → disk:

```ts
import { writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

const blob = await exportPng(designer.document);
await writeFile('preview.png', Buffer.from(await blob.arrayBuffer()));
```

Browser → download:

```ts
const blob = await exportPng(designer.document);
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = 'preview.png';
a.click();
URL.revokeObjectURL(a.href);
```

## `exportPdf(doc, rows?, options?)`

```ts
// Single-page PDF (one label):
const single = await exportPdf(designer.document);

// Multi-page batch (one page per row):
const batch = await exportPdf(designer.document, [
  { name: 'Piet', order_id: '001' },
  { name: 'Anna', order_id: '002' },
  { name: 'Tom', order_id: '003' },
]);
```

The first argument after `doc` is the **rows array** — each entry
becomes one PDF page with its variables applied. Pass `undefined` or
an empty array to get a single page.

Page size is derived from the rendered image at the document's DPI, so
a 696 × 300 dot label at 300 DPI produces an A4-ish landscape strip —
no clipping, no letterboxing. Each page uses its own size (so batches
with continuous-height labels can have differently-sized pages).

Use `exportPdf` when you want:

- A one-page proof to email to a client.
- An archive of a batch run where you can visually scan for oddities.
- A hand-off to an external print service that expects PDF.

For actual thermal printing, use `renderPlanes()` + a driver — PDF is
overkill and loses the bit-exact thermal output.

## `exportSheet(doc, sheet, rows?, options?)`

Tile labels onto a sticker sheet. The output is a single PDF — A4 or
US Letter, portrait — with the label design repeated across each
position on the sheet.

```ts
import {
  exportSheet,
  BUILTIN_SHEETS,
  findSheet,
  listSheets,
  type SheetTemplate,
} from '@burnmark-io/designer-core';

// Find by code:
const l7160 = findSheet('avery-l7160');

// Or pick from the built-in list:
const all = listSheets(); // SheetTemplate[]
```

### `SheetTemplate` shape

```ts
interface SheetTemplate {
  code: string; // 'avery-l7160'
  name: string; // 'Avery L7160 — 21 per sheet (63.5 × 38.1 mm)'
  paperSize: string; // 'A4', 'Letter', any named size
  paperWidthMm: number;
  paperHeightMm: number;
  labelWidthMm: number;
  labelHeightMm: number;
  layouts: SheetLayout[]; // one or more grid layouts per sheet
  labelShape?: 'rectangle' | 'round' | 'ellipse'; // UI metadata
  cornerRadiusMm?: number; // UI metadata
  marginMm?: number; // UI metadata
}

interface SheetLayout {
  columns: number; // labels per row in this layout
  rows: number; // label rows in this layout
  originXMm: number; // left offset of the first label
  originYMm: number; // top offset of the first label
  pitchXMm: number; // horizontal distance between label origins
  pitchYMm: number; // vertical distance between label origins
}
```

Most sheets have one layout. A few — staggered business-card sheets,
offset product-code sheets — have two: a "normal" grid and an offset
grid on the same page. `exportSheet` walks every layout and places
labels in top-to-bottom, left-to-right order regardless of which layout
a position came from.

The three optional fields (`labelShape`, `cornerRadiusMm`, `marginMm`)
are carry-through UI metadata. `exportSheet` does not consume them —
use them when drawing cut guides in your own preview canvas.

Built-in sheets include `avery-l7160`, `avery-l7163`, `avery-l7173`,
`herma-4226`, `avery-l7671` (round), and `letter-30up` (Avery 5160).
Full list via `burnmark list-sheets` from the CLI.

### Avery L7160 walkthrough — 21 labels per A4

```ts
import { exportSheet, findSheet, LabelDesigner, parseCsv } from '@burnmark-io/designer-core';
import { readFile, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

// 1. Load the address-label design.
const designer = new LabelDesigner();
designer.fromJSON(await readFile('christmas-card.label', 'utf-8'));

// 2. Load the CSV of addresses.
const csv = await parseCsv(await readFile('addresses.csv', 'utf-8'));

// 3. Render onto Avery L7160 (21 positions per A4).
const sheet = findSheet('avery-l7160');
if (!sheet) throw new Error('Sheet template missing');

const blob = await exportSheet(designer.document, sheet, csv.rows);

// 4. Save the PDF.
await writeFile('sheet.pdf', Buffer.from(await blob.arrayBuffer()));
```

- If `csv.rows.length === 21`, you get one A4 sheet with each address
  on its own label position.
- If `csv.rows.length === 50`, you get three A4 sheets — the first two
  full (21 labels each), the third with 8 filled positions and 13
  blank.
- If you pass no `rows` at all, every position is filled with the same
  label. That's useful for rendering 21 identical stickers.

### Layout helpers

```ts
import {
  labelsPerPage,
  positionsFromSheet,
  primaryLayout,
  isMultiLayout,
  sheetsNeeded,
} from '@burnmark-io/designer-core';

labelsPerPage(sheet); // 21  — total positions across every layout
sheetsNeeded(sheet, 50); // 3   — ceil(50 / 21)
isMultiLayout(sheet); // false for avery-l7160; true for staggered sheets
primaryLayout(sheet); // the first SheetLayout — the common case

positionsFromSheet(sheet);
// [{ xMm: 7.2, yMm: 15.1 }, { xMm: 73.2, yMm: 15.1 }, …] — sorted top-to-bottom, left-to-right
```

`labelsPerPage` is also exported as `positionsPerSheet` for
backwards-readable code; the two are aliases.

## `exportBundled(doc, assetLoader?)`

A `.label` file is portable by itself — the document JSON — but if
your document references `ImageObject`s by `assetKey`, those bytes are
**not** in the JSON. `exportBundled` produces a `.zip` containing the
document plus every referenced asset:

```
bundle.zip
├── label.json          the serialised LabelDocument
└── assets/
    ├── <assetKey-1>    image bytes
    └── <assetKey-2>    image bytes
```

### The `{ blob, missing }` contract

`exportBundled` returns an object, **not** just a Blob:

```ts
const { blob, missing } = await exportBundled(designer.document, designer.assetLoader);

if (missing.length > 0) {
  console.warn(`Bundle produced with ${missing.length} missing asset(s):`, missing);
  // Decide whether to ship the bundle anyway or fail.
}

// Ship the zip:
await writeFile('my-label-bundle.zip', Buffer.from(await blob.arrayBuffer()));
```

**Always check `missing` before using the bundle.** Each entry is an
`assetKey` that the loader couldn't resolve — usually because:

- The asset was registered in an earlier session and is no longer in
  the in-memory loader.
- You're passing a different loader than the one the designer was
  originally built with.
- The image was referenced but never stored (a common bug in save
  flows).

Shipping a bundle with missing assets is legitimate in some workflows
— for example, bundling a design that ships with "pre-installed"
asset keys that the recipient already has — but silently dropping
assets is rarely what users want. Surface `missing` in your UI.

### Asset loader argument

`assetLoader` is the second argument — not an options object — because
you always need one for a bundle to be useful:

```ts
import { exportBundled, InMemoryAssetLoader } from '@burnmark-io/designer-core';

const loader = new InMemoryAssetLoader();
await loader.store(myImageBytes); // returns the asset key — use that in the ImageObject

// …build the document…

const { blob, missing } = await exportBundled(designer.document, loader);
```

If you're exporting the document on a designer you already have:

```ts
const { blob, missing } = await exportBundled(designer.document, designer.assetLoader);
```

## The `.label` file format

`exportPng`, `exportPdf`, and `exportSheet` all accept a live
`LabelDocument`. Serialise and deserialise via `toJSON` / `fromJSON` or
the designer wrappers:

```ts
import { toJSON, fromJSON } from '@burnmark-io/designer-core';

// Serialise a live designer's document:
const json = toJSON(designer.document); // or designer.toJSON()
await writeFile('my-label.label', json, 'utf-8');

// Load a `.label` file:
const doc = fromJSON(await readFile('my-label.label', 'utf-8'));
// doc is guaranteed to be migrated to CURRENT_DOCUMENT_VERSION.
```

See the [`.label` format reference](/reference/label-format) for the
full field-by-field schema and examples.
