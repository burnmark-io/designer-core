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

| Package                                           | Description                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| [`@burnmark-io/designer-core`](./packages/core)   | Document model, render pipeline, colour flattening, template engine, exports |
| [`burnmark-cli`](./packages/cli)                  | Command-line interface — render, print, validate, CSV batch                  |
| [`@burnmark-io/designer-vue`](./packages/vue)     | Vue 3 composable — reactive document, debounced render, selection            |
| [`@burnmark-io/designer-react`](./packages/react) | React 18+ hook — same API shape as the Vue composable                        |

## Install

### Core (Node or browser, no framework)

```bash
pnpm add @burnmark-io/designer-core
```

### Vue 3

```bash
pnpm add @burnmark-io/designer-vue @burnmark-io/designer-core vue
```

### React 18+

```bash
pnpm add @burnmark-io/designer-react @burnmark-io/designer-core react
```

## Quick start

### Core — direct, no framework

```ts
import { LabelDesigner } from '@burnmark-io/designer-core';

const designer = new LabelDesigner({
  canvas: { widthDots: 696, heightDots: 0, dpi: 300 },
});

designer.add({
  type: 'text',
  x: 10,
  y: 10,
  width: 676,
  height: 40,
  rotation: 0,
  opacity: 1,
  locked: false,
  visible: true,
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

const bitmap = await designer.renderToBitmap({ name: 'Piet' });
```

### Vue 3 composable

```vue
<script setup lang="ts">
import { useLabelDesigner } from '@burnmark-io/designer-vue';

const { document, bitmap, isRendering, canUndo, add, undo } = useLabelDesigner({
  canvas: { widthDots: 696, heightDots: 0, dpi: 300 },
});
</script>
```

Document, bitmap, and history state are reactive; a render is kicked off
200ms after the last change. See [`packages/vue/README.md`](./packages/vue/README.md).

### React 18+ hook

```tsx
import { useLabelDesigner } from '@burnmark-io/designer-react';

export function Editor() {
  const { document, bitmap, isRendering, canUndo, add, undo } = useLabelDesigner({
    canvas: { widthDots: 696, heightDots: 0, dpi: 300 },
  });
  // …
}
```

StrictMode- and SSR-safe; same render/selection/history semantics as the
Vue composable. See [`packages/react/README.md`](./packages/react/README.md).

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
