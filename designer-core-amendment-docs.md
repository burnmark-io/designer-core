# designer-core — Amendment: Full Documentation

> Follow-up to the designer-core v1 implementation. Build this AFTER core + cli
> are stable. The v1 plan includes minimal docs (landing page + getting started).
> This amendment covers the full VitePress documentation site.

---

## 1. Site Structure

```
docs/
├── index.md                landing page — hero, install, quick start
├── getting-started.md      scripting quick start, CLI usage, install
├── guide/
│   ├── document-model.md   LabelDocument, objects, canvas config
│   ├── colour-model.md     colour pipeline, PrinterCapabilities, flattening
│   ├── rendering.md        render pipeline, single vs multi-colour, continuous labels
│   ├── template-engine.md  {{placeholders}}, CSV batch, validation
│   ├── barcodes.md         all formats with examples, QRContent helpers
│   ├── fonts.md            bundled fonts, user fonts, system fonts, fallback
│   ├── export.md           PNG, PDF, sheet export, .label bundle
│   ├── sheet-export.md     sticker sheets, SheetTemplate, Avery/Herma reference
│   └── cli.md              all commands, flags, scripting examples
├── embedding/
│   ├── vanilla.md          embed in a vanilla JS/TS app
│   ├── vue.md              @burnmark-io/designer-vue composable guide
│   ├── react.md            @burnmark-io/designer-react hook guide
│   └── custom-renderer.md  implement Renderer interface for non-Canvas envs
├── reference/
│   ├── label-format.md     .label file format spec, versioning, migration
│   ├── printer-adapter.md  PrinterAdapter interface, capabilities, implementing
│   ├── barcode-formats.md  full table of all BarcodeFormat values + notes
│   └── api/                auto-generated via typedoc
└── .vitepress/
    └── config.ts
```

---

## 2. Page Content Guide

### Landing page (`index.md`)

VitePress home layout. Hero with:
- "burnmark designer-core" heading
- "Headless label design engine for Node.js and browser" tagline
- Get started / API Reference / GitHub buttons
- Feature cards: Headless, Multi-colour, 50+ Barcodes, CSV Batch, Sheet Export
- Install snippet: `pnpm add @burnmark-io/designer-core`
- 10-line quick start: create designer, add text, render, export PNG

### Getting started (`getting-started.md`)

Three paths:
1. **Node.js script** — import, create document, add objects, render, print
2. **CLI** — install, `burnmark render`, `burnmark print`
3. **Browser** — import, OffscreenCanvas, export PNG

Each path is a complete working example. Include shell commands for install
and expected output.

### Guide pages

Each guide page:
- Starts with a one-paragraph explanation of what the feature does
- Shows a minimal working code example
- Documents all options and their defaults
- Notes any caveats (opacity on thermal, system fonts on Node.js, etc.)
- Links to the API reference for full type details

**`colour-model.md`** is especially important — explain the design philosophy
(colours are honest, flattening happens at output), show the
`PrinterCapabilities` setup, demonstrate explicit `cssMatch`, show what
happens when grey objects hit the dithering pipeline.

**`barcodes.md`** — one example per category (1D, 2D, GS1, postal). Include
the `QRContent` helper examples for WiFi, vCard, geo. Show validation usage.

**`template-engine.md`** — the Christmas cards example from the beginning.
Full CSV → template → batch → print walkthrough.

**`sheet-export.md`** — show how to render a label design tiled onto an
Avery L7160 sheet as a PDF. Include a visual diagram of the sheet layout.

### Embedding pages

Written AFTER the framework bindings amendment is complete. Each page shows
a complete minimal example of embedding the designer in that framework:
- Vanilla: raw `LabelDesigner` + manual DOM updates
- Vue: `useLabelDesigner` composable with template
- React: `useLabelDesigner` hook with JSX

### Reference pages

- `.label` file format: full JSON schema with annotations
- Printer adapter: how to implement for a new printer family
- Barcode formats: full table, same as in the plan but with `bwip-js` render examples

---

## 3. VitePress Config

```typescript
import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'designer-core',
  description: 'Headless label design engine for Node.js and browser',
  base: '/designer-core/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'Embedding', link: '/embedding/vanilla' },
      { text: 'Reference', link: '/reference/label-format' },
      { text: 'API', link: '/reference/api/' },
    ],
    sidebar: {
      '/': [
        { text: 'Getting Started', link: '/getting-started' },
        {
          text: 'Guide',
          items: [
            { text: 'Document Model', link: '/guide/document-model' },
            { text: 'Colour Model', link: '/guide/colour-model' },
            { text: 'Rendering', link: '/guide/rendering' },
            { text: 'Template Engine', link: '/guide/template-engine' },
            { text: 'Barcodes', link: '/guide/barcodes' },
            { text: 'Fonts', link: '/guide/fonts' },
            { text: 'Export', link: '/guide/export' },
            { text: 'Sheet Export', link: '/guide/sheet-export' },
            { text: 'CLI', link: '/guide/cli' },
          ],
        },
        {
          text: 'Embedding',
          items: [
            { text: 'Vanilla JS/TS', link: '/embedding/vanilla' },
            { text: 'Vue', link: '/embedding/vue' },
            { text: 'React', link: '/embedding/react' },
            { text: 'Custom Renderer', link: '/embedding/custom-renderer' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: '.label Format', link: '/reference/label-format' },
            { text: 'Printer Adapter', link: '/reference/printer-adapter' },
            { text: 'Barcode Formats', link: '/reference/barcode-formats' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/burnmark-io/designer-core' },
    ],
    search: { provider: 'local' },
  },
});
```

---

## 4. Implementation Sequence

```
1. Expand VitePress config with full sidebar structure
2. Write guide pages — document-model, colour-model, rendering, template-engine,
   barcodes, fonts, export, sheet-export, cli
3. Write reference pages — label-format, printer-adapter, barcode-formats
4. Write embedding pages (requires framework bindings amendment to be complete)
5. Generate API reference via typedoc
6. Gate: docs:build completes without errors
7. Deploy to GitHub Pages
```

All pages must be fully authored — complete prose, real code examples using
the actual implemented API, no placeholder content.
