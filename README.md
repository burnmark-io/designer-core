# designer-core

[![CI](https://github.com/burnmark-io/designer-core/actions/workflows/ci.yml/badge.svg)](https://github.com/burnmark-io/designer-core/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Headless, framework-agnostic label design engine** for the burnmark
ecosystem. Runs identically in Node.js 24 and all modern browsers — no DOM,
no Vue/React imports, no UI dependencies.

Design labels in full colour with text, images, barcodes, and shapes.
Flatten to printer-specific capabilities (single-colour thermal, two-colour
Brother QL, etc.) at output time. Render to 1bpp bitmaps, PNG, or PDF.
Drive batch production from CSV. Print directly from Node scripts via the
`@thermal-label/*` driver family.

## Packages

| Package | Description |
|---|---|
| [`@burnmark-io/designer-core`](./packages/core) | Document model, render pipeline, colour flattening, template engine, exports |
| [`burnmark-cli`](./packages/cli) | Command-line interface — render, print, validate, CSV batch |

Framework bindings for Vue and React are planned as a follow-up — see
[`designer-core-amendment-bindings.md`](./designer-core-amendment-bindings.md).

## Install

```bash
pnpm add @burnmark-io/designer-core
# or
npm install @burnmark-io/designer-core
```

## Quick start

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

const bitmap = await designer.renderToBitmap({ name: 'Mannes' });
```

## Contributing

Built with pnpm workspaces, TypeScript, Vitest, and changesets.

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

## License

MIT © Mannes Brak
