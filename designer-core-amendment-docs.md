# designer-core — Amendment: Full Documentation (v2)

> Follow-up to the designer-core v1 implementation. The v1 plan delivered
> minimal docs (landing page + getting started). This amendment specifies
> the full VitePress documentation site.
>
> **Build this AFTER the framework bindings amendment is complete** — the
> embedding pages depend on the Vue/React bindings being real, tested code.
>
> **The source code is the ground truth.** Inspect `packages/core/src/`,
> `packages/cli/src/`, `packages/vue/src/`, `packages/react/src/` for the
> actual API. The implementation plan's type definitions may have drifted
> during build. Every code example in the docs must compile against the
> shipped API.

---

## 1. Site Structure

```
docs/
├── index.md                  landing page
├── getting-started.md        install + three quick starts
├── guide/
│   ├── document-model.md     LabelDocument, objects, canvas, serialisation
│   ├── colour-model.md       colour pipeline, flattening, dithering behaviour
│   ├── rendering.md          render pipeline, multi-colour, continuous labels
│   ├── template-engine.md    placeholders, CSV batch, the Christmas cards example
│   ├── barcodes.md           formats, QRContent helpers, validation
│   ├── fonts.md              bundled, user, system, fallback behaviour
│   ├── export.md             PNG, PDF, sheet tiling, .label bundle
│   └── cli.md                all commands, flags, scripting recipes
├── embedding/
│   ├── vanilla.md            raw LabelDesigner in plain JS/TS
│   ├── vue.md                useLabelDesigner composable
│   ├── react.md              useLabelDesigner hook
│   └── custom-renderer.md    implement Renderer for non-Canvas environments
├── reference/
│   ├── label-format.md       .label JSON spec, versioning, migration
│   ├── printer-adapter.md    PrinterAdapter, capabilities, building a new driver
│   ├── barcode-formats.md    full BarcodeFormat table with notes
│   ├── faq.md                troubleshooting, common issues, gotchas
│   └── api/                  auto-generated via typedoc (classes, functions,
│       ├── README.md            interfaces, type-aliases, variables)
│       ├── classes/
│       ├── functions/
│       ├── interfaces/
│       ├── type-aliases/
│       └── variables/
└── .vitepress/
    └── config.ts
```

---

## 2. Page Specifications

Every page must be **fully authored** — complete prose, real code examples
that compile against the shipped API, no placeholder content. Import paths
must match the actual published package exports.

### 2.1 `index.md` — Landing Page

VitePress `home` layout.

**Hero:**
- Heading: `burnmark designer-core`
- Tagline: "Headless label design engine for Node.js and browser"
- Actions: Get started → `/getting-started`, API → `/reference/api/`, GitHub → repo link

**Feature cards (4–6):**
- Headless — runs in Node.js and browser, no DOM required
- Multi-colour — design in full colour, flatten to printer capabilities
- 50+ Barcodes — Code128, QR, DataMatrix, EAN, GS1, and more
- CSV Batch — template variables, async generator, memory-efficient
- Sheet Export — tile labels onto Avery/Herma sticker sheets as PDF
- Framework Bindings — Vue composable, React hook, or plain TypeScript

**Quick start snippet** — 10 lines, create designer → add text → render → export PNG.

### 2.2 `getting-started.md`

Three complete paths, each self-contained with install commands and expected output:

**Path 1 — Node.js script:**
```
pnpm add @burnmark-io/designer-core
```
Create a designer, add a text object, render to bitmap, export PNG to disk.
Show the actual output file. Mention `@napi-rs/canvas` as optional dep for
Node.js rendering.

**Path 2 — CLI:**
```
pnpm add -g burnmark-cli @thermal-label/brother-ql-node
burnmark render --template my-label.label --output preview.png
burnmark print --template my-label.label --printer usb://brother-ql
```
Show creating a `.label` file by hand (JSON), rendering, printing. Mention
dynamic driver discovery.

**Path 3 — Browser:**
Import in a bundled app, use `OffscreenCanvas`, export PNG blob, download.
Note `OffscreenCanvas` requirement (Safari 16.4+).

### 2.3 `guide/document-model.md`

- `LabelDocument` structure — canvas, objects, metadata, versioning
- `CanvasConfig` — widthDots, heightDots (0 = continuous), dpi, margins, background
- Object types overview with one-line descriptions
- `BaseObject` fields — position, size, rotation, opacity, colour, lock, visibility
- Each object type (`TextObject`, `ImageObject`, `BarcodeObject`, `ShapeObject`,
  `GroupObject`) with its specific fields and a minimal creation example
- Serialisation: `toJSON()` / `fromJSON()` / `.label` file format
- Document versioning: `migrateDocument()`, version field, migration registry
- History: undo/redo, `maxHistoryDepth`, snapshot behaviour

### 2.4 `guide/colour-model.md`

**This is the most important conceptual page.** Explain clearly:

- Design philosophy: objects store real CSS colours, output pipeline flattens
- `PrinterCapabilities` — what it is, `SINGLE_COLOR` and `TWO_COLOR_BLACK_RED` presets
- `flattenForPrinter()` — explicit `cssMatch` only, no heuristics
- Walk through a two-colour label example end-to-end: black heading + red
  "FRAGILE" text → rendered to two planes → sent to Brother QL
- What happens with grey: `#808080` text → goes to black plane → dithered
  to scattered dots by `@mbtech-nl/bitmap`. Show a simulated output.
- What happens with opacity: `opacity: 0.5` → Canvas composites at 50% →
  1bpp dithering produces stipple pattern. Warn that this is rarely what
  users want for thermal printing. Recommend `opacity: 1.0`.
- What happens with unmatched colours: `#ff6633` (orange) not in any
  `cssMatch` → goes to default plane (black). Predictable, not surprising.
- PNG/PDF export keeps full colour — no flattening

### 2.5 `guide/rendering.md`

- Pipeline overview diagram (text version of the render flow from the plan)
- Single-colour path: `renderToBitmap()` — the simple case
- Multi-colour path: `renderPlanes(capabilities)` — returns `Map<string, LabelBitmap>`
- `render()` for raw RGBA (no flattening, used for previews and PNG export)
- Continuous labels (`heightDots: 0`): auto-height from content bounds
- Per-object image settings: `threshold` and `dither` per `ImageObject`
- Canvas abstraction: `OffscreenCanvas` in browser, `@napi-rs/canvas` in Node.js
- Performance notes: typical render times, batch memory behaviour

### 2.6 `guide/template-engine.md`

- `{{placeholder}}` syntax rules (case-insensitive, whitespace trimmed)
- `extractPlaceholders()` — find all tokens in a document
- `applyVariables()` — substitute values
- `validateVariables()` — check for missing/unused variables, overflow warnings
- **The Christmas cards walkthrough:** design a label with `{{name}}`,
  `{{address_line_1}}`, `{{city}}`, `{{postcode}}`. Load a CSV. Auto-map
  columns. Render batch. Print. Full working code from start to finish.
- CSV parsing: `parseCsv()` with `papaparse`, header detection, edge cases
- `renderBatch()` — async generator, memory efficiency, yielding `BatchResult`

### 2.7 `guide/barcodes.md`

- BarcodeEngine overview (internal, used via `BarcodeObject`)
- One working example per category:
  - 1D: Code 128 shipping label
  - 2D: QR code with URL
  - GS1: GS1-128 supply chain barcode
  - Postal: KIX code for Dutch addressing (relevant to the maintainer's locale)
- `QRContent` helpers with examples: `QRContent.wifi()`, `QRContent.vcard()`,
  `QRContent.geo()`, `QRContent.url()`
- Barcode validation: `BarcodeEngine.validate()`, handling invalid data gracefully
- Minimum size calculation: `BarcodeEngine.minimumSize()`
- Barcode colour: inherits from `BaseObject.color`, renders to correct plane
- Link to the full format table in `reference/barcode-formats.md`

### 2.8 `guide/fonts.md`

- Bundled fonts: Inter, JetBrains Mono, Bitter, Barlow Condensed — when to use each
- `registerFont()` — load a custom WOFF2/TTF from URL or buffer
- `listFonts()`, `isFontLoaded()` — query loaded fonts
- System fonts: available in browser (Canvas uses installed fonts), not in Node.js
- Fallback behaviour: missing font → `Burnmark Sans` (Inter) + warning
- Font subsetting: why we subset, what's included (Latin + Latin Extended)
- OFL license: what it means for redistribution

### 2.9 `guide/export.md`

- `exportPng()` — full colour, scale factor, browser `Blob` / Node.js `Buffer`
- `exportPdf()` — single page or multi-page batch (one label per page, full colour)
- `exportSheet(sheet, rows?)` — tile labels onto a sticker sheet, `jsPDF` output
  - `SheetTemplate` type — code, paper size, dimensions, grid
  - Walk through an Avery L7160 example with 21 labels per A4 sheet
  - Bulk: each CSV row fills one position, auto-paginates
- `exportBundled()` — `.zip` containing `.label` + all referenced image/font assets
  for portability and sharing
- `.label` file format: JSON, reference `reference/label-format.md` for full spec

### 2.10 `guide/cli.md`

- Install: `pnpm add -g burnmark-cli` + install desired driver packages
- Driver discovery: dynamic `import()`, install only what you need
- Every command with a complete example:
  - `burnmark render` — template → PNG or PDF
  - `burnmark render --sheet` — template → sticker sheet PDF
  - `burnmark print` — template → printer (USB or TCP)
  - `burnmark print --csv` — batch print from CSV
  - `burnmark validate` — check template + CSV compatibility
  - `burnmark list-printers` — show connected printers
  - `burnmark list-sheets` — show available sheet templates
- Flags table with defaults and descriptions
- Scripting recipes: CI pipeline label generation, cron job, npm script

### 2.11 `embedding/vanilla.md`

Embed `LabelDesigner` in a plain JS/TS application with no framework:

- Import and construct `LabelDesigner`
- Add objects programmatically
- Listen to `'change'` and `'error'` events
- Call `render()` to get `RawImageData`, draw on a `<canvas>` element
- Call `renderToBitmap()` for 1bpp preview
- Handle fonts and assets manually
- Full working HTML + TypeScript example

### 2.12 `embedding/vue.md`

> **Requires bindings amendment to be complete.**

- Install `@burnmark-io/designer-vue` + peer deps
- `useLabelDesigner()` composable — full API with reactive state
- Selection management (lives in composable, not core)
- Debounced bitmap preview with `isRendering` spinner
- Error/warning handling via `renderError` / `renderWarning`
- Complete single-file component example with Konva canvas + properties panel
- Two-colour example with `capabilities: TWO_COLOR_BLACK_RED`

### 2.13 `embedding/react.md`

> **Requires bindings amendment to be complete.**

- Install `@burnmark-io/designer-react` + peer deps
- `useLabelDesigner()` hook — full API
- StrictMode and SSR safety notes
- Same scope as the Vue page but with React idioms
- Complete example with Canvas preview + controls

### 2.14 `embedding/custom-renderer.md`

- The `Renderer` interface: `renderToImageData(doc, variables): Promise<RawImageData>`
- When to implement: server-side rendering without Canvas, headless testing,
  alternative rendering backends
- Example: a mock renderer that returns a solid-colour bitmap for testing
- Example: a renderer wrapping `sharp` or `puppeteer` for server-side rendering

### 2.15 `reference/label-format.md`

- Complete `.label` JSON schema with field-by-field annotations
- Version field: current version, what it means, `migrateDocument()` contract
- Example file: the Christmas card address label from `guide/template-engine.md`
- Asset references: `assetKey` content-addressed keys, external storage
- Metadata field: user-defined, not rendered, useful for template categorisation
- Forward compatibility: old files opened in newer versions, migration chain

### 2.16 `reference/printer-adapter.md`

- `PrinterAdapter` interface with all methods documented
- `PrinterCapabilities` — colours, cssMatch, presets
- `PrinterStatus` — fields and meaning
- How to implement for a new printer family:
  - Step-by-step guide referencing the existing drivers as examples
  - What `print(planes)` receives and how to extract bitmaps
  - Status reporting
- Link to `@thermal-label/*` driver source as reference implementations

### 2.17 `reference/barcode-formats.md`

Full table of every `BarcodeFormat` value:
- Format name, constant string, category (1D/2D/GS1/postal), typical use case
- Same content as the plan's section 6 tables but in a dedicated reference page
- Link to `bwip-js` documentation for advanced options per format

### 2.18 `reference/faq.md`

Troubleshooting and common issues:

- "OffscreenCanvas is not defined" — browser version requirement, SSR guard
- "Font not found, falling back to Burnmark Sans" — font loading, system font
  availability in Node.js
- "Barcode data validation failed" — common format-specific data errors
- "Opacity looks wrong on thermal print" — explain dithering, recommend 1.0
- "Grey text looks speckled" — explain dithering, this is correct behaviour
- "Colour didn't go to the red plane" — explain explicit cssMatch, add
  colour to the list
- "OffscreenCanvas width/height exceeds limit" — canvas size limits per browser
- "renderBatch memory usage is high" — verify using async generator correctly,
  not collecting all results into an array

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
            { text: 'FAQ', link: '/reference/faq' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/burnmark-io/designer-core' },
    ],
    search: { provider: 'local' },
    footer: {
      message: 'Not affiliated with Dymo, Brother, Avery, or any hardware vendor.',
      copyright: 'MIT License © 2025 Mannes Brak',
    },
  },
});
```

---

## 4. Implementation Sequence

```
1. VitePress config
   - Expand .vitepress/config.ts with full nav, sidebar, footer
   - Verify docs:dev starts without errors
   - Commit + push

2. Landing page + getting started
   - index.md (home layout, hero, feature cards, quick start)
   - getting-started.md (three paths: Node.js, CLI, browser)
   - Gate: docs:build
   - Commit + push

3. Guide pages — core concepts
   - guide/document-model.md
   - guide/colour-model.md
   - guide/rendering.md
   - Gate: docs:build
   - Commit + push

4. Guide pages — features
   - guide/template-engine.md (include Christmas cards walkthrough)
   - guide/barcodes.md
   - guide/fonts.md
   - Gate: docs:build
   - Commit + push

5. Guide pages — output
   - guide/export.md (PNG, PDF, sheet, bundle — combined, not separate pages)
   - guide/cli.md
   - Gate: docs:build
   - Commit + push

6. Reference pages
   - reference/label-format.md
   - reference/printer-adapter.md
   - reference/barcode-formats.md
   - reference/faq.md
   - Gate: docs:build
   - Commit + push

7. Embedding pages
   - embedding/vanilla.md
   - embedding/vue.md (requires bindings to be shipped)
   - embedding/react.md (requires bindings to be shipped)
   - embedding/custom-renderer.md
   - Gate: docs:build
   - Commit + push

8. API reference
   - Run pnpm docs:api (typedoc generation)
   - Verify generated pages render correctly
   - Gate: docs:build
   - Commit + push

9. Final
   - Full read-through for broken links, stale imports, missing examples
   - Verify all code examples compile against the actual shipped API
   - Gate: docs:build completes without errors or warnings
   - Deploy to GitHub Pages
   - Commit + push
```

All pages must use real code examples from the shipped API. Inspect
`packages/*/src/` for actual method signatures — the plan may have
drifted during implementation.