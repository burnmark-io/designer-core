**@burnmark-io/designer-core**

***

# @burnmark-io/designer-core

[![npm version](https://img.shields.io/npm/v/@burnmark-io/designer-core.svg)](https://www.npmjs.com/package/@burnmark-io/designer-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

Headless, framework-agnostic label design engine. Runs identically in
Node.js 24 and all modern browsers.

## Install

```bash
pnpm add @burnmark-io/designer-core
```

**Requirements:** Node.js 24+, or a modern browser with `OffscreenCanvas`
(Safari 16.4+, Chrome 69+, Firefox 105+).

For Node.js rendering, add the optional peer dependency:

```bash
pnpm add @napi-rs/canvas
```

## Key exports

```ts
import {
  // Main class
  LabelDesigner,

  // Document model
  type LabelDocument,
  type CanvasConfig,
  type LabelObject,
  type TextObject,
  type ImageObject,
  type BarcodeObject,
  type ShapeObject,
  type GroupObject,
  type BarcodeFormat,

  // Colour pipeline
  type PrinterCapabilities,
  type PrinterColor,
  SINGLE_COLOR,
  TWO_COLOR_BLACK_RED,
  flattenForPrinter,

  // Template engine
  applyTemplate,
  extractPlaceholders,
  validateVariables,
  parseCsv,
  renderBatch,

  // Barcodes
  QRContent,

  // Storage / printer adapter interfaces
  type LabelStore,
  type LabelSummary,
  type AssetStore,
  type PrinterAdapter,
  type PrinterStatus,
  type PrintOptions,

  // Fonts
  registerFont,
  listFonts,
  isFontLoaded,

  // Migration
  migrateDocument,
} from '@burnmark-io/designer-core';
```

## Document model

A `LabelDocument` is plain JSON — a canvas configuration plus a list of
objects (text, image, barcode, shape, group). Every object has a CSS
`color` string; the design is colour-honest and flattening to printer
capabilities happens at output time.

See [the colour model guide](https://burnmark-io.github.io/designer-core/guide/colour-model)
for the full story.

## Render pipeline

```
LabelDocument → apply variables → render to Canvas → @mbtech-nl/bitmap → LabelBitmap
```

For multi-colour printers, `renderPlanes(capabilities)` returns a
`Map<string, LabelBitmap>` — one 1bpp bitmap per colour plane.

## Scripting quick start

```ts
import { LabelDesigner, SINGLE_COLOR } from '@burnmark-io/designer-core';

const designer = new LabelDesigner({
  canvas: { widthDots: 696, heightDots: 0, dpi: 300 },
});

designer.add({
  type: 'text',
  x: 10, y: 10, width: 676, height: 40,
  rotation: 0, opacity: 1,
  locked: false, visible: true,
  color: '#000000',
  content: 'Order #{{order_id}}',
  fontFamily: 'Burnmark Sans',
  fontSize: 24,
  fontWeight: 'bold',
  fontStyle: 'normal',
  textAlign: 'left',
  verticalAlign: 'top',
  letterSpacing: 0,
  lineHeight: 1.2,
  invert: false,
  wrap: true,
  autoHeight: false,
});

const planes = await designer.renderPlanes(SINGLE_COLOR, { order_id: '12345' });
// planes.get('black') → LabelBitmap ready for the printer
```

## Barcodes

50+ formats via `bwip-js`. See the
[barcode reference](https://burnmark-io.github.io/designer-core/reference/barcode-formats)
for the full list with examples. Quick helpers for QR content:

```ts
import { QRContent } from '@burnmark-io/designer-core';

QRContent.wifi('MyNetwork', 'hunter2');
QRContent.url('https://example.com');
QRContent.vcard({ firstName: 'Mannes', lastName: 'Brak', ... });
```

## Template engine

Any string field (text content, barcode data) supports `{{placeholder}}`
substitution. Feed CSV data to `renderBatch` for bulk label generation.

```ts
import { renderBatch, parseCsv } from '@burnmark-io/designer-core';

const csv = await parseCsv(fileContents);
for await (const result of renderBatch(designer, csv.rows)) {
  // result.planes.get('black') → one bitmap per row
}
```

## Fonts — replacing placeholder files

The package includes four `Burnmark *` font family names that map to
OFL-licensed typefaces (Inter, JetBrains Mono, Bitter, Barlow Condensed).
For a production deployment, drop WOFF2 subsets into `src/fonts/bundled/`
— the loader picks them up automatically. See [D4 in DECISIONS.md](_media/DECISIONS.md).

## License

MIT © Mannes Brak
