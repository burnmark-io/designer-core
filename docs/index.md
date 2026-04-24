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
      text: API reference
      link: /reference/api/
    - theme: alt
      text: GitHub
      link: https://github.com/burnmark-io/designer-core

features:
  - title: Headless
    details: Pure TypeScript document model + render pipeline. Runs in Node.js, the browser, and CI without a DOM or UI framework.
  - title: Multi-colour
    details: Design in full CSS colour. Output flattens to printer capabilities — single-colour thermal, two-colour Brother QL, and beyond.
  - title: 50+ barcodes
    details: bwip-js integration covers Code 128, QR, Data Matrix, PDF417, Aztec, GS1, Royal Mail, KIX, and more.
  - title: CSV batch
    details: Placeholder templates and a CSV → one label per row, as a memory-efficient async generator.
  - title: Sheet export
    details: Tile a design across Avery, Herma, or custom sticker sheets and render the sheet to a single PDF.
  - title: Vendor-neutral
    details: Ships against the PrinterAdapter interface. Drop in @thermal-label/* drivers for Brother QL, DYMO LabelWriter, DYMO LabelManager, or roll your own.
  - title: Framework bindings
    details: Vue composable and React hook over the same core. Selection state, debounced preview, and error surfaces are handled for you.
  - title: Templated `.label` files
    details: Portable JSON format with a built-in version + migration chain. Bundle a label and its assets into a single `.zip` for sharing.
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
import { LabelDesigner, exportPng } from '@burnmark-io/designer-core';

const designer = new LabelDesigner({
  canvas: { widthDots: 696, heightDots: 0, dpi: 300 },
});

designer.add({
  type: 'text',
  x: 20, y: 20, width: 656, height: 60,
  rotation: 0, opacity: 1, locked: false, visible: true,
  color: '#000000',
  content: 'Hello, {{name}}!',
  fontFamily: 'Burnmark Sans',
  fontSize: 40, fontWeight: 'bold', fontStyle: 'normal',
  textAlign: 'left', verticalAlign: 'top',
  letterSpacing: 0, lineHeight: 1.2,
  invert: false, wrap: true, autoHeight: false,
});

const blob = await exportPng(designer.document, {
  variables: { name: 'Piet' },
});
```

Continue to [Getting started](/getting-started) for Node.js, CLI, and
browser paths, or jump straight to the [API reference](/reference/api/).
