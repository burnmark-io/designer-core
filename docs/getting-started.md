# Getting Started

Three ways to use designer-core: as a Node.js library, through the CLI, or in the browser.

## Node.js script

Install the package:

```bash
pnpm add @burnmark-io/designer-core @napi-rs/canvas
```

`@napi-rs/canvas` is an optional peer dependency needed only for Node.js rendering.

Write a script:

```ts
import { writeFile } from 'node:fs/promises';
import {
  LabelDesigner,
  exportPng,
  renderBatch,
  parseCsv,
} from '@burnmark-io/designer-core';

// 1. Build a document in code
const designer = new LabelDesigner({
  canvas: { widthDots: 696, heightDots: 0, dpi: 300 },
});

designer.add({
  type: 'text',
  x: 10, y: 10, width: 676, height: 40,
  rotation: 0, opacity: 1,
  locked: false, visible: true,
  color: '#000000',
  content: 'Order #{{order_id}} — {{name}}',
  fontFamily: 'Burnmark Sans',
  fontSize: 28,
  fontWeight: 'bold', fontStyle: 'normal',
  textAlign: 'left', verticalAlign: 'top',
  letterSpacing: 0, lineHeight: 1.2,
  invert: false, wrap: true, autoHeight: false,
});

designer.add({
  type: 'barcode',
  x: 10, y: 60, width: 200, height: 60,
  rotation: 0, opacity: 1,
  locked: false, visible: true,
  color: '#000000',
  format: 'qrcode',
  data: 'https://example.com/order/{{order_id}}',
  options: { eclevel: 'M' },
});

// 2. Render a PNG preview
const blob = await exportPng(designer.document, {
  variables: { order_id: '12345', name: 'Mannes' },
});
await writeFile('preview.png', Buffer.from(await blob.arrayBuffer()));

// 3. Batch render from CSV
const csv = await parseCsv(await Bun.file('orders.csv').text());
for await (const result of renderBatch(designer, csv.rows)) {
  const plane = result.planes.get('black');
  // Hand `plane` to your printer driver…
}
```

Load a `.label` file from disk:

```ts
import { readFile } from 'node:fs/promises';
import { LabelDesigner } from '@burnmark-io/designer-core';

const json = await readFile('my-label.label', 'utf-8');
const designer = new LabelDesigner();
designer.fromJSON(json);
```

## CLI

Install the CLI globally or use via `npx`:

```bash
pnpm add -g burnmark-cli
# or
npx burnmark-cli <command>
```

Render:

```bash
burnmark render --template badge.label --var name="Mannes" --output badge.png
burnmark render --template cards.label --csv addresses.csv --output cards.pdf
burnmark render --template sku.label --sheet avery-l7160 --csv skus.csv --output sheet.pdf
```

Validate before a big batch:

```bash
burnmark validate --template invoice.label --csv orders.csv
```

Print (requires a `@thermal-label/*` driver):

```bash
pnpm add @thermal-label/brother-ql-node
burnmark print --template cards.label --csv addresses.csv --printer usb://brother-ql
```

See built-in sheet templates and installed drivers:

```bash
burnmark list-sheets
burnmark list-printers
```

## Browser

```ts
import { LabelDesigner, exportPng } from '@burnmark-io/designer-core';

const designer = new LabelDesigner({
  canvas: { widthDots: 696, heightDots: 0, dpi: 300 },
});
// …add objects…

const blob = await exportPng(designer.document);
const url = URL.createObjectURL(blob);
document.querySelector('img')!.src = url;
```

OffscreenCanvas is required (Safari 16.4+, Chrome 69+, Firefox 105+). No
`@napi-rs/canvas` install is needed in the browser.

## Colour model

The design canvas is full-colour. Flattening to a printer's capabilities
happens at output time via `renderPlanes(capabilities)`. See the
[PrinterCapabilities](https://github.com/burnmark-io/designer-core/blob/main/PLAN.md#5-colour-pipeline)
section of the plan for more detail — the flattening pipeline will be
covered in depth once the full docs land (see the docs amendment file).

## What's next

Framework bindings (Vue composable, React hook) and a full VitePress
guide are deferred to follow-up amendments — see
[`designer-core-amendment-bindings.md`](https://github.com/burnmark-io/designer-core/blob/main/designer-core-amendment-bindings.md)
and [`designer-core-amendment-docs.md`](https://github.com/burnmark-io/designer-core/blob/main/designer-core-amendment-docs.md).
