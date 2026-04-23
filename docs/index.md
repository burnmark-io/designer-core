---
layout: home

hero:
  name: designer-core
  text: Headless label design engine
  tagline: Runs identically in Node.js 24 and all modern browsers — no DOM, no Vue/React, no UI dependencies.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/burnmark-io/designer-core

features:
  - title: Headless
    details: Pure TypeScript document model + render pipeline. No framework imports. Runs in Node, the browser, and CI.
  - title: Multi-colour
    details: Design in full CSS colour. Output flattens to printer capabilities — single-colour thermal, two-colour Brother QL, and beyond.
  - title: 50+ barcodes
    details: bwip-js integration covers Code 128, QR, Data Matrix, PDF417, Aztec, GS1, postal codes, and more.
  - title: CSV batch
    details: Placeholder templates + CSV → one label per row. Memory-efficient async generator.
  - title: Sheet export
    details: Tile a design across Avery, Herma, or custom sticker sheets. Render to PDF.
  - title: Vendor-neutral
    details: Ships against the PrinterAdapter interface. Drop in @thermal-label/* drivers for Brother QL, DYMO LabelWriter, DYMO LabelManager.
---

## Install

```bash
pnpm add @burnmark-io/designer-core
```

Optionally install a printer driver:

```bash
pnpm add @thermal-label/brother-ql-node
```

## 10-line quick start

```ts
import { LabelDesigner } from '@burnmark-io/designer-core';

const designer = new LabelDesigner({
  canvas: { widthDots: 696, heightDots: 0, dpi: 300 },
});

designer.add({
  type: 'text',
  x: 10, y: 10, width: 676, height: 40,
  rotation: 0, opacity: 1,
  locked: false, visible: true,
  color: '#000000',
  content: 'Hello, {{name}}!',
  fontFamily: 'Burnmark Sans',
  fontSize: 24,
  fontWeight: 'bold', fontStyle: 'normal',
  textAlign: 'left', verticalAlign: 'top',
  letterSpacing: 0, lineHeight: 1.2,
  invert: false, wrap: true, autoHeight: false,
});

const bitmap = await designer.renderToBitmap({ name: 'Mannes' });
```
