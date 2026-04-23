# @burnmark-io/designer-core — Implementation Plan

> Agent implementation plan for the headless, framework-agnostic label design
> engine. Document model, colour-aware render pipeline, barcode generation,
> template engine, CSV batch rendering, history, storage abstraction, and
> printer adapter interface — with zero UI dependencies.
>
> Runs in Node.js 24 and all modern browsers. The `label-maker` Vue application
> (burnmark) is the reference implementation built on top of this package.
> Third parties can build their own UIs, embed a designer in an existing app,
> or drive label generation entirely programmatically from scripts or CI.
>
> **Lessons from the driver implementations apply here in full.**
> See section 17 — Key Constraints & Agent Notes.

---

## 1. Design Goals

- **Headless first.** No DOM APIs, no Vue/React/Angular imports. Every public
  API works identically in Node.js and browser.
- **Framework-agnostic.** State and logic are plain TypeScript classes and
  functions. UI framework bindings (Vue composables, React hooks) are thin
  optional wrappers, not requirements.
- **Scripting-friendly.** A Node.js script should be able to import this
  package, build a label in code, render it, and print it — with no browser,
  no canvas, no UI.
- **Embeddable.** An existing web app (React, Angular, vanilla) should be
  able to drop in a label designer with minimal integration effort.
- **Serialisable.** The entire document state round-trips cleanly to/from JSON.
  `.label` files are human-readable and version-control friendly.
- **Colour-honest.** The design model stores real colours. The output pipeline
  flattens to printer capabilities. The user designs in full colour; the
  printer gets what it can handle.

---

## 2. Repository

`github.com/burnmark-io/designer-core`

Internal structure — a pnpm monorepo:

```
designer-core/
├── .github/
│   ├── FUNDING.yml
│   └── workflows/
│       ├── ci.yml
│       ├── release.yml
│       └── docs.yml
├── packages/
│   ├── core/           @burnmark-io/designer-core
│   ├── react/          @burnmark-io/designer-react
│   ├── vue/            @burnmark-io/designer-vue
│   └── cli/            burnmark-cli
├── docs/               VitePress
├── LICENSE
├── eslint.config.js
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

---

## 3. Tooling & Configuration

### 3.1 Runtime & Package Manager

- **Node.js**: `>=24.0.0`
- **Package manager**: `pnpm >=9.0.0`
- **TypeScript**: `~5.5.0`

### 3.2 `LICENSE`

MIT license, copyright Mannes Brak, current year.

### 3.3 `.github/FUNDING.yml`

```yaml
github: mannes
ko_fi: mannes
```

### 3.4 Root `package.json`

```json
{
  "name": "designer-core",
  "private": true,
  "engines": { "node": ">=24.0.0", "pnpm": ">=9.0.0" },
  "prettier": "@mbtech-nl/prettier-config",
  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "test:coverage": "pnpm -r run test:coverage",
    "lint": "eslint packages",
    "format": "prettier --write packages docs",
    "typecheck": "pnpm -r run typecheck",
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:api": "typedoc --plugin typedoc-plugin-markdown --out docs/api packages/*/src/index.ts",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.0.0",
    "@mbtech-nl/eslint-config": "^1.0.0",
    "@mbtech-nl/prettier-config": "^1.0.0",
    "@mbtech-nl/tsconfig": "^1.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "typedoc": "^0.26.0",
    "typedoc-plugin-markdown": "^4.0.0",
    "typescript": "~5.5.0",
    "vitepress": "^1.0.0",
    "vitest": "^2.0.0"
  }
}
```

### 3.5 `eslint.config.js`

```js
import mbtech from '@mbtech-nl/eslint-config';
export default [...mbtech];
```

### 3.6 `tsconfig.base.json`

```json
{
  "extends": "@mbtech-nl/tsconfig/node",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### 3.7 Per-Package `package.json` Common Fields

```json
{
  "version": "0.0.0",
  "type": "module",
  "author": "Mannes Brak",
  "license": "MIT",
  "homepage": "https://burnmark-io.github.io/designer-core/",
  "repository": {
    "type": "git",
    "url": "https://github.com/burnmark-io/designer-core.git",
    "directory": "packages/<package-name>"
  },
  "bugs": {
    "url": "https://github.com/burnmark-io/designer-core/issues"
  },
  "funding": [
    { "type": "github", "url": "https://github.com/sponsors/mannes" },
    { "type": "ko-fi",  "url": "https://ko-fi.com/mannes" }
  ],
  "files": ["dist", "README.md"],
  "engines": { "node": ">=24.0.0" },
  "publishConfig": { "access": "public" },
  "sideEffects": false,
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

Notes:
- `core` package sets `"types": "./src/index.ts"` so workspace consumers get
  types without a build step.
- `cli` package adds `"bin": { "burnmark": "./bin/burnmark.js" }` and `"bin"` to `files`.

### 3.8 Per-Package README Requirements

Every package must ship a complete, publish-ready `README.md`:

**All packages:** package name heading, one-line description, npm install snippet,
requirements, links to docs site, license badge.

**`@burnmark-io/designer-core`:** API overview with key exports, document model
summary, colour model explanation, render pipeline overview, scripting quick start,
barcode format reference link, template engine quick start.

**`@burnmark-io/designer-vue`:** install, Vue composable usage example with
`useLabelDesigner`, reactive state explanation, link to full docs.

**`@burnmark-io/designer-react`:** install, React hook usage example, state
management pattern, link to full docs.

**`burnmark-cli`:** global install snippet, all commands with one-line descriptions,
usage example per command.

### 3.9 Testing

Vitest in all packages. `@vitest/coverage-v8` in every package's devDependencies.
90% coverage threshold enforced at final step only. Coverage uploaded to Codecov.

---

## 4. Document Model

### 4.1 LabelDocument

```typescript
export interface LabelDocument {
  id: string;                     // UUID
  version: number;                // schema version for migration
  name: string;
  description?: string;
  createdAt: string;              // ISO 8601
  updatedAt: string;
  canvas: CanvasConfig;
  objects: LabelObject[];
  metadata: Record<string, unknown>;  // user-defined key/value, not rendered
}

export interface CanvasConfig {
  widthDots: number;
  heightDots: number;             // 0 = continuous length (auto from content)
  dpi: number;                    // 203 | 300 | 600
  margins: Margins;
  background: string;             // CSS colour, default '#ffffff'
  grid: { enabled: boolean; spacingDots: number };
}

export interface Margins {
  top: number;    // dots
  right: number;
  bottom: number;
  left: number;
}
```

### 4.2 LabelObject — discriminated union

```typescript
export type LabelObject =
  | TextObject
  | ImageObject
  | BarcodeObject
  | ShapeObject
  | GroupObject;

export interface BaseObject {
  id: string;
  type: string;
  x: number;          // dots from left edge of canvas
  y: number;          // dots from top edge of canvas
  width: number;      // dots
  height: number;     // dots
  rotation: number;   // degrees
  opacity: number;    // 0–1 (composited on Canvas, then flattened to 1bpp by bitmap)
  locked: boolean;
  visible: boolean;
  name?: string;      // user-assigned layer name
  color: string;      // CSS colour value, default '#000000'
}
```

**Colour model:** `color` is any valid CSS colour string (`'#000000'`,
`'#ff0000'`, `'red'`, `'rgb(255,0,0)'`, etc.). The design canvas renders
objects at their true colour. The output pipeline flattens to printer
capabilities — see section 8.2.

**Opacity model:** `opacity` is composited during the Canvas render pass
(the Canvas API handles this natively). The resulting RGBA pixels are then
converted to 1bpp by `@mbtech-nl/bitmap`. In practice, sub-1.0 opacity on
text produces a dithered stipple pattern in the 1bpp output, which is
typically not what users expect. **Emit an `'error'` event (as a warning)
when rendering objects with opacity < 1.0 to a bitmap target.** Opacity
works correctly for PNG and PDF exports where full RGBA is preserved.

For v1, recommend users use `opacity: 1.0` for all thermal print objects.
The property exists in the model for Canvas design view and export formats
where it behaves correctly.

### 4.2.1 Document Versioning

The `version` field on `LabelDocument` enables forward-compatible file
format evolution. Every change to the document schema increments the version
number and registers a migration function.

```typescript
export function migrateDocument(doc: unknown): LabelDocument;
```

`migrateDocument` checks `version` and applies transforms sequentially
(v1→v2, v2→v3, etc.) until the document matches the current schema version.
For v1 this is identity — the function validates and returns. But the
registry must exist from day one so `.label` files created today can be
opened by future versions without special-casing.

```typescript
const MIGRATIONS: Record<number, (doc: unknown) => unknown> = {
  1: (doc) => doc,  // v1 is the current version — identity
  // 2: (doc) => { ... transform v1 → v2 ... },
};
```

### 4.3 TextObject

```typescript
export interface TextObject extends BaseObject {
  type: 'text';
  content: string;           // may contain {{placeholder}} tokens
  fontFamily: string;        // must match a loaded font name
  fontSize: number;          // points
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  letterSpacing: number;     // em units
  lineHeight: number;        // multiplier, default 1.2
  invert: boolean;           // white text on black background
  wrap: boolean;             // word-wrap within object bounds
  autoHeight: boolean;       // expand height to fit content
}
```

Text colour is inherited from `BaseObject.color`. The entire text object
renders in one colour. For mixed-colour text on the same line, use
separate text objects positioned adjacent — per-character colour is a
future enhancement, not v1.

### 4.4 ImageObject

```typescript
export interface ImageObject extends BaseObject {
  type: 'image';
  assetKey: string;          // content-addressed key into asset store
  fit: 'contain' | 'cover' | 'fill' | 'none';
  threshold: number;         // 0–255 for 1bpp conversion, per-object
  dither: boolean;           // Floyd-Steinberg, per-object
  invert: boolean;
}
```

Each image has its own `threshold` and `dither` settings. Two images on the
same label can have different dither modes — one with Floyd-Steinberg, one
with simple threshold. The render pipeline applies these per-object.

`color` on `ImageObject` determines which colour plane the image renders to.
A `'#ff0000'` image goes to the red plane on a two-colour printer.

### 4.5 BarcodeObject

```typescript
export interface BarcodeObject extends BaseObject {
  type: 'barcode';
  format: BarcodeFormat;     // see section 6
  data: string;              // may contain {{placeholder}} tokens
  options: BarcodeOptions;
}

export interface BarcodeOptions {
  // Common
  scale?: number;            // module size multiplier
  rotate?: 'N' | 'R' | 'L' | 'I';  // normal/right/left/inverted
  padding?: number;          // dots of whitespace around barcode
  // 1D specific
  includetext?: boolean;     // show human-readable text below
  textsize?: number;
  textyoffset?: number;
  // QR / 2D specific
  eclevel?: 'L' | 'M' | 'Q' | 'H';  // error correction level
  version?: number;          // QR version 1–40, 0 = auto
  // Data Matrix / PDF417
  rows?: number;
  columns?: number;
}
```

Barcode colour is inherited from `BaseObject.color`. A red barcode on a
Brother QL two-colour label renders to the red plane.

### 4.6 ShapeObject

```typescript
export interface ShapeObject extends BaseObject {
  type: 'shape';
  shape: 'rectangle' | 'ellipse' | 'line';
  fill: boolean;
  strokeWidth: number;       // dots
  invert: boolean;
  cornerRadius?: number;     // rectangle only, dots
  lineDirection?: 'horizontal' | 'vertical' | 'diagonal-ltr' | 'diagonal-rtl';
}
```

### 4.7 GroupObject

```typescript
export interface GroupObject extends BaseObject {
  type: 'group';
  children: LabelObject[];   // relative coordinates within group
}
```

---

## 5. Colour Pipeline

This is the core design decision that enables multi-colour printing while
keeping the design model honest and future-proof.

### 5.1 Principle

**The user designs in full colour. The output pipeline flattens to what the
printer can physically produce.** PDF and PNG exports keep the original colours.

### 5.2 Printer Capabilities

```typescript
export interface PrinterCapabilities {
  colors: PrinterColor[];    // what the printer can produce
}

export interface PrinterColor {
  name: string;              // 'black', 'red', etc.
  cssMatch: string[];        // CSS colours that map to this plane
  // e.g. black: ['#000000', '#000', 'black']
  // e.g. red:   ['#ff0000', '#f00', 'red']
}

export const SINGLE_COLOR: PrinterCapabilities = {
  colors: [{ name: 'black', cssMatch: ['*'] }],  // everything → black
};

export const TWO_COLOR_BLACK_RED: PrinterCapabilities = {
  colors: [
    { name: 'black', cssMatch: ['*'] },           // default: everything → black
    { name: 'red',   cssMatch: ['#ff0000', '#f00', 'red', '#cc0000', '#ff3333'] },
  ],
};
```

### 5.3 Colour Flattening

```typescript
export function flattenForPrinter(
  document: LabelDocument,
  capabilities: PrinterCapabilities,
  variables?: Record<string, string>,
): Promise<Map<string, LabelBitmap>>;
```

Algorithm:
1. For each colour in `capabilities.colors`, create a separate canvas
2. Walk all objects in z-order
3. For each object, determine which colour plane it belongs to:
   - Check `object.color` against each `PrinterColor.cssMatch` list
   - First match wins; `'*'` is the default/fallback (always black)
   - Grey values (`#808080` etc.) → black plane → dithering produces
     the density variation naturally via `@mbtech-nl/bitmap`
4. Render the object to that plane's canvas at full colour
5. Convert each canvas to `LabelBitmap` via `@mbtech-nl/bitmap`
6. Overlap resolution: where both planes have a set bit at the same
   position, black wins (matches Brother QL firmware behaviour)

### 5.4 Single-Colour Shortcut

For single-colour printers, `flattenForPrinter` degenerates to: render
everything to one canvas, convert to one `LabelBitmap`. The colour value
on each object is ignored — everything becomes black through the
threshold/dither step. This is the common case and should be fast-pathed.

### 5.5 What Each Export Does

| Output | Colour handling |
|---|---|
| `render()` → `RawImageData` | Full RGBA, no flattening |
| `renderToBitmap()` → `LabelBitmap` | Single-plane 1bpp (all objects → black) |
| `renderPlanes(capabilities)` → `Map<string, LabelBitmap>` | Multi-plane 1bpp |
| `exportPng()` → `Blob` | Full colour PNG |
| `exportPdf()` → `Blob` | Full colour PDF |
| `exportSheet(sheet)` → `Blob` | Full colour PDF tiled to sticker sheet |

---

## 6. Barcode Support

`bwip-js` supports over 100 barcode formats. The following are explicitly
documented and tested. Grouped by category for the UI's format picker.

### 6.1 1D Linear Barcodes

| Format | `BarcodeFormat` constant | Notes |
|---|---|---|
| Code 128 (auto) | `code128` | Most common shipping/logistics |
| Code 128A | `code128a` | |
| Code 128B | `code128b` | |
| Code 128C | `code128c` | Numeric pairs only, compact |
| Code 39 | `code39` | Alphanumeric |
| Code 39 Extended | `code39ext` | Full ASCII |
| Code 93 | `code93` | More compact than Code 39 |
| Code 11 | `code11` | Telecom |
| Codabar | `codabar` | Medical, libraries |
| EAN-13 | `ean13` | Retail |
| EAN-8 | `ean8` | Small retail |
| UPC-A | `upca` | North American retail |
| UPC-E | `upce` | Compact UPC |
| ITF-14 | `itf14` | Shipping cartons |
| Interleaved 2 of 5 | `interleaved2of5` | Warehouse/logistics |
| GS1-128 | `gs1-128` | Supply chain |
| GS1 DataBar | `databar` | Point of sale |
| GS1 DataBar Expanded | `databarexpanded` | |
| Pharmacode | `pharmacode` | Pharmaceutical |
| MSI Plessey | `msi` | Inventory |
| POSTNET | `postnet` | US postal |
| Royal Mail (RM4SCC) | `royalmail` | UK postal |
| KIX Code | `kix` | Dutch postal (TNT Post) |
| USPS Intelligent Mail | `onecode` | |

### 6.2 2D Barcodes

| Format | `BarcodeFormat` constant | Notes |
|---|---|---|
| QR Code | `qrcode` | Universal |
| Micro QR | `microqr` | Compact QR |
| Data Matrix | `datamatrix` | Industrial, pharmaceutical |
| Data Matrix Rectangular | `datamatrixrectangular` | |
| PDF417 | `pdf417` | High-density, ID documents |
| Micro PDF417 | `micropdf417` | |
| Aztec Code | `azteccode` | Transport tickets |
| Aztec Rune | `aztecrune` | |
| MaxiCode | `maxicode` | UPS shipping |
| DotCode | `dotcode` | High-speed printing |
| Han Xin | `hanxin` | Chinese standard |

### 6.3 GS1 / Supply Chain

| Format | `BarcodeFormat` constant | Notes |
|---|---|---|
| GS1 QR Code | `gs1qrcode` | QR with GS1 application identifiers |
| GS1 Data Matrix | `gs1datamatrix` | |
| GS1 Composite | `gs1-cc` | |

### 6.4 Postal / Specific Industry

| Format | `BarcodeFormat` constant | Notes |
|---|---|---|
| Australian Post | `auspost` | |
| Japan Post | `japanpost` | |
| Deutsche Post Leitcode | `leitcode` | |
| Deutsche Post Identcode | `identcode` | |
| HIBC (Health Industry) | `hibccode128` | Medical devices |
| ISBT 128 | `isbt128` | Blood bank |
| PZN (German pharma) | `pzn` | |

### 6.5 BarcodeFormat Type & BarcodeEngine Class

`BarcodeFormat` **must be exported** — it's used in `BarcodeObject.format`
which is part of the public document model. Use underscores, not hyphens,
for identifiers (TypeScript-friendly).

```typescript
/** Exported — part of the public document model */
export type BarcodeFormat =
  | 'code128' | 'code128a' | 'code128b' | 'code128c'
  | 'code39' | 'code39ext' | 'code93' | 'code11'
  | 'codabar' | 'ean13' | 'ean8' | 'upca' | 'upce'
  | 'itf14' | 'interleaved2of5'
  | 'gs1_128' | 'databar' | 'databarexpanded'
  | 'pharmacode' | 'msi' | 'postnet' | 'royalmail' | 'kix' | 'onecode'
  | 'qrcode' | 'microqr'
  | 'datamatrix' | 'datamatrixrectangular'
  | 'pdf417' | 'micropdf417'
  | 'azteccode' | 'aztecrune'
  | 'maxicode' | 'dotcode' | 'hanxin'
  | 'gs1qrcode' | 'gs1datamatrix' | 'gs1_cc'
  | 'auspost' | 'japanpost' | 'leitcode' | 'identcode'
  | 'hibccode128' | 'isbt128' | 'pzn';

/** Internal — not exported directly, used by the render pipeline */
class BarcodeEngine {
  render(format: BarcodeFormat, data: string, options: BarcodeOptions,
         targetWidthDots: number, targetHeightDots: number): Promise<RawImageData>;
  validate(format: BarcodeFormat, data: string): ValidationResult;
  minimumSize(format: BarcodeFormat, data: string, dpi: number):
    { widthDots: number; heightDots: number };
}
```

### 6.6 Placeholder Support in Barcode Data

Barcode `data` fields support `{{placeholder}}` template syntax. In bulk mode,
the barcode is re-rendered per CSV row. Validation runs per-row before batch.

### 6.7 QR Content Helpers

```typescript
export const QRContent = {
  url(url: string): string;
  wifi(ssid: string, password: string, security?: 'WPA' | 'WEP' | 'nopass'): string;
  vcard(contact: VCardContact): string;
  email(to: string, subject?: string, body?: string): string;
  phone(number: string): string;
  sms(number: string, message?: string): string;
  geo(lat: number, lng: number): string;
  text(text: string): string;
};
```

---

## 7. Template Engine

### 7.1 Syntax

Double-curly-brace placeholders in any string field:

```
Hello {{first_name}} {{last_name}}
Order #{{order_id}}
{{address_line_1}}
```

Rules:
- Case-insensitive: `{{Name}}` = `{{name}}`
- Whitespace trimmed: `{{ name }}` = `{{name}}`
- Unknown placeholders left as-is (warning in UI, rendered literally)
- Nested placeholders not supported

### 7.2 Functions

```typescript
export function extractPlaceholders(doc: LabelDocument): string[];
export function applyTemplate(template: string, variables: Record<string, string>): string;
export function validateVariables(
  doc: LabelDocument,
  variables: Record<string, string>,
): ValidationResult;

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  unused: string[];
  warnings: string[];
}
```

### 7.3 CSV Integration

```typescript
export interface CsvData {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

export function parseCsv(input: string | File | Buffer): Promise<CsvData>;

export async function* renderBatch(
  designer: LabelDesigner,
  rows: Record<string, string>[],
  capabilities?: PrinterCapabilities,
): AsyncGenerator<BatchResult>;

export interface BatchResult {
  row: Record<string, string>;
  index: number;
  planes: Map<string, LabelBitmap>;  // one bitmap per colour plane
}
```

`renderBatch` yields one result per CSV row. Memory-efficient — each bitmap
is yielded and can be sent to the printer and GC'd before the next is rendered.
If `capabilities` is omitted, defaults to `SINGLE_COLOR` (one plane).

---

## 8. Font System

### 8.1 Bundled Fonts

Four open-license fonts bundled as WOFF2, subset to Latin + Latin Extended:

| Name | Actual font | Style | Use case | License |
|---|---|---|---|---|
| `Burnmark Sans` | Inter | Condensed grotesque | General purpose | OFL |
| `Burnmark Mono` | JetBrains Mono | Monospace | Serial numbers, codes | OFL |
| `Burnmark Serif` | Bitter | Slab serif | Formal, product labels | OFL |
| `Burnmark Narrow` | Barlow Condensed | Ultra-condensed | Max text on narrow tape | OFL |

File sizes target under 50KB each after subsetting. Include the OFL license
text for each font in the package.

### 8.2 User Fonts

```typescript
export async function registerFont(
  family: string,
  source: ArrayBuffer | Uint8Array | string,  // buffer, bytes, or URL
): Promise<void>;
export function listFonts(): FontDescriptor[];
export function isFontLoaded(family: string): boolean;
```

Browser: Font Loading API (`new FontFace()`).
Node.js: `@napi-rs/canvas` `registerFont()`.

### 8.3 System Fonts

In the browser, Canvas `fillText` can use any installed system font. Worth
exposing — the user picks "Arial" in the UI and it works. However, system
fonts are NOT available in the Node.js render path without explicit
`@napi-rs/canvas` registration. If a `.label` file references a system font
and is rendered in Node.js, fall back to `Burnmark Sans` with a warning.

### 8.4 Font Fallback

If a requested font family is not loaded, fall back to `Burnmark Sans` and
emit a warning. Never silently use a system default — the output must be
predictable across environments.

---

## 9. Render Pipeline

### 9.1 Single-Colour Render

```
LabelDocument + variables
        ↓
  1. resolveAssets()       load all referenced image/font assets
  2. applyVariables()      substitute {{placeholders}} in all string fields
  3. validateDocument()    check all assets loaded, all barcodes valid
        ↓
  4. createCanvas()        OffscreenCanvas (browser) or @napi-rs/canvas (Node)
  5. renderBackground()    fill with background colour
  6. renderObjects()       walk objects in z-order:
     ├── text   → ctx.fillText() with font, size, alignment, wrapping
     │           ctx.fillStyle = object.color (CSS value)
     │           ctx.globalAlpha = object.opacity
     ├── image  → ctx.drawImage() with fit mode
     ├── barcode → BarcodeEngine.render() → ctx.drawImage()
     ├── shape  → Canvas path primitives with object.color
     └── group  → recursive renderObjects() with transform
  7. getImageData()        → RawImageData (RGBA)
        ↓
  8. @mbtech-nl/bitmap
     └── renderImage()    → LabelBitmap (1bpp)
```

### 9.2 Multi-Colour Render (e.g. Brother QL two-colour)

```
LabelDocument + variables + PrinterCapabilities
        ↓
  1–3. Same as single-colour
        ↓
  4. For each colour plane in capabilities:
     a. createCanvas() — one per plane
     b. Filter objects: which objects belong to this plane?
        - Match object.color against plane.cssMatch[]
        - '*' wildcard = default plane (usually black)
        - Unmatched colours → default plane
     c. renderObjects() — only the filtered objects
     d. getImageData() → RawImageData for this plane
     e. @mbtech-nl/bitmap → LabelBitmap for this plane
        ↓
  5. Overlap resolution:
     - Where two planes both have a set bit: black wins
     - Clear the conflicting bit in the non-black plane
        ↓
  6. Return Map<string, LabelBitmap>
```

### 9.3 Colour Matching Logic

**Explicit matches only — no heuristics.**

```typescript
function matchColourToPlane(
  objectColor: string,
  capabilities: PrinterCapabilities,
): string {
  // Normalise the colour for comparison (lowercase, trim)
  const normalised = objectColor.trim().toLowerCase();

  // Check explicit matches — first matching plane wins
  for (const plane of capabilities.colors) {
    if (plane.cssMatch.includes('*')) continue; // skip wildcard on first pass
    if (plane.cssMatch.some(c => c.toLowerCase() === normalised)) {
      return plane.name;
    }
  }

  // No explicit match — fall through to the default plane (the one with '*')
  const defaultPlane = capabilities.colors.find(p => p.cssMatch.includes('*'));
  return defaultPlane?.name ?? 'black';
}
```

No RGB parsing, no "is it red-ish" guessing. If the user's colour is in the
`cssMatch` list, it goes to that plane. If not, it goes to the default (black).
This is predictable, debuggable, and never misroutes oranges or pinks.

The consuming app (label-maker) can show a visual indicator per object:
"this colour will print in the red plane" / "this colour will print as black."
That's a UI concern, not a core concern.

To add more red-ish colours to the red plane, extend `cssMatch`:
```typescript
export const TWO_COLOR_BLACK_RED: PrinterCapabilities = {
  colors: [
    { name: 'black', cssMatch: ['*'] },
    { name: 'red',   cssMatch: [
      '#ff0000', '#f00', 'red', '#cc0000', '#ff3333',
      '#e60000', '#b30000', '#ff1a1a', 'darkred', 'crimson',
    ]},
  ],
};
```

### 9.4 Continuous Labels (heightDots === 0)

- Render to an oversized scratch canvas (e.g. 10000 dots tall)
- After rendering all objects, measure actual content bounds
  (lowest non-background row + bottom margin)
- Crop canvas to content height
- Return cropped `RawImageData`

### 9.5 Node.js vs Browser Rendering

Identical pipeline. Only the canvas implementation differs:

```typescript
async function createCanvas(width: number, height: number): Promise<CanvasLike> {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const { createCanvas } = await import('@napi-rs/canvas');
  return createCanvas(width, height);
}
```

**`OffscreenCanvas` is required in browsers.** Supported in Safari 16.4+,
Chrome 69+, Firefox 105+. Do not fall back to `<canvas>` DOM element — that
would couple core to the DOM and break the headless design goal. For SSR
contexts without `OffscreenCanvas`, the `@napi-rs/canvas` Node.js path applies.

`@napi-rs/canvas` is an optional peer dependency — only required in Node.js.

---

## 10. LabelDesigner Class

The main entry point. Manages document state, history, and rendering.

```typescript
export class LabelDesigner {
  constructor(options: DesignerOptions);

  // --- Document ---
  // Returns the current document state. Do NOT mutate the returned object
  // directly — use add/update/remove/setCanvas methods which track history.
  // In development, enable debug mode to deep-freeze the returned object.
  readonly document: LabelDocument;
  loadDocument(doc: LabelDocument): void;
  newDocument(canvas: Partial<CanvasConfig>): void;
  toJSON(): string;
  fromJSON(json: string): void;

  // --- Objects ---
  add(object: Omit<LabelObject, 'id'>): string;         // returns new id
  update(id: string, patch: Partial<LabelObject>): void;
  remove(id: string): void;
  reorder(id: string, direction: 'up' | 'down' | 'top' | 'bottom'): void;
  get(id: string): LabelObject | undefined;
  getAll(): LabelObject[];

  // NOTE: Selection is NOT managed by LabelDesigner. Selection is UI state
  // and belongs in the consuming framework binding (Vue composable, React hook)
  // or the application. Core only manages document state and rendering.

  // --- Canvas ---
  setCanvas(config: Partial<CanvasConfig>): void;

  // --- History ---
  undo(): void;
  redo(): void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  clearHistory(): void;

  // --- Rendering ---
  render(variables?: Record<string, string>): Promise<RawImageData>;
  renderToBitmap(variables?: Record<string, string>): Promise<LabelBitmap>;
  renderPlanes(
    capabilities: PrinterCapabilities,
    variables?: Record<string, string>,
  ): Promise<Map<string, LabelBitmap>>;
  renderBatch(
    rows: Record<string, string>[],
    capabilities?: PrinterCapabilities,
  ): AsyncGenerator<BatchResult>;

  // --- Export ---
  exportPng(variables?: Record<string, string>, scale?: number): Promise<Blob>;
  exportPdf(rows?: Record<string, string>[]): Promise<Blob>;
  exportSheet(
    sheet: SheetTemplate,
    rows?: Record<string, string>[],
  ): Promise<Blob>;
  exportBundled(): Promise<Blob>;  // .zip with .label + all assets

  // --- Templates ---
  getPlaceholders(): string[];
  applyVariables(variables: Record<string, string>): LabelDocument;

  // --- Events ---
  on(event: DesignerEvent, handler: () => void): () => void;
  off(event: DesignerEvent, handler: () => void): void;
}

export type DesignerEvent =
  | 'change'        // any document mutation
  | 'render'        // render completed
  | 'historyChange' // undo/redo stack changed
  | 'error';        // render failure, missing font, invalid barcode, etc.

export interface DesignerOptions {
  canvas?: Partial<CanvasConfig>;
  maxHistoryDepth?: number;       // default 100
  fontLoader?: FontLoader;
  assetLoader?: AssetLoader;
  renderer?: Renderer;
}
```

### 10.1 Renderer Interface

```typescript
export interface Renderer {
  renderToImageData(doc: LabelDocument, variables?: Record<string, string>): Promise<RawImageData>;
}
```

### 10.2 FontLoader Interface

```typescript
export interface FontLoader {
  load(family: string): Promise<void>;
  isLoaded(family: string): boolean;
  listLoaded(): string[];
}
```

### 10.3 AssetLoader Interface

```typescript
export interface AssetLoader {
  load(key: string): Promise<Blob | Buffer>;
  store(data: Blob | Buffer): Promise<string>;
}
```

---

## 11. Sheet Export

Tiles a label design across a sticker sheet and exports as a print-ready PDF.

```typescript
export interface SheetTemplate {
  code: string;           // e.g. 'avery-l7160'
  name: string;
  paperSize: 'A4' | 'Letter';
  labelWidthMm: number;
  labelHeightMm: number;
  columns: number;
  rows: number;
  marginTopMm: number;
  marginLeftMm: number;
  gutterHMm: number;
  gutterVMm: number;
}

export async function exportSheet(
  designer: LabelDesigner,
  sheet: SheetTemplate,
  rows?: Record<string, string>[],  // bulk: one label per CSV row, fills pages
): Promise<Blob>;  // PDF
```

If `rows` is provided, each CSV row fills a label position on the sheet.
If `rows` is omitted, all positions are filled with the same label.

Sheet templates come from `@burnmark-io/sheet-templates` — a separate package
with the JSON registry. The `SheetTemplate` type is defined here in
designer-core; the registry package just provides data conforming to it.

Uses `jsPDF` for PDF generation — pure JS, runs in both browser and Node.js.

---

## 12. Storage Abstraction

designer-core defines interfaces but does not implement them. Consuming
packages provide implementations.

```typescript
export interface LabelStore {
  save(doc: LabelDocument): Promise<void>;
  load(id: string): Promise<LabelDocument>;
  list(): Promise<LabelSummary[]>;
  delete(id: string): Promise<void>;
}

export interface LabelSummary {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  canvasWidth: number;
  canvasHeight: number;
}

export interface AssetStore {
  store(data: Blob | Buffer, mimeType: string): Promise<string>;
  load(key: string): Promise<Blob | Buffer>;
  delete(key: string): Promise<void>;
}
```

Implementations:
- label-maker Vue app: IndexedDB via `idb`
- Node.js scripting: filesystem
- Custom: S3, SQLite, anything

---

## 13. Printer Adapter Interface

designer-core defines the interface; vendor driver packages implement it.

```typescript
export interface PrinterAdapter {
  readonly family: string;  // 'labelmanager' | 'labelwriter' | 'brother-ql' | etc.
  readonly model: string;
  readonly connected: boolean;
  readonly capabilities: PrinterCapabilities;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): Promise<PrinterStatus>;
  print(planes: Map<string, LabelBitmap>, options?: PrintOptions): Promise<void>;
}

export interface PrinterStatus {
  ready: boolean;
  mediaLoaded: boolean;
  mediaWidthMm?: number;
  mediaType?: string;
  errors: string[];
}

export interface PrintOptions {
  density?: 'light' | 'normal' | 'dark';
  copies?: number;
}
```

The `print` method accepts `Map<string, LabelBitmap>` — the output of
`renderPlanes()`. For single-colour printers, the map has one entry (`'black'`).
For two-colour, it has two (`'black'`, `'red'`). The driver extracts the
planes it knows about and ignores any extras.

---

## 14. Serialisation — `.label` File Format

Plain JSON. Human-readable, diff-friendly. Assets referenced by key,
not embedded.

```json
{
  "version": 1,
  "id": "a1b2c3d4-...",
  "name": "Christmas Card Address",
  "canvas": {
    "widthDots": 696,
    "heightDots": 0,
    "dpi": 300,
    "margins": { "top": 10, "right": 10, "bottom": 10, "left": 10 },
    "background": "#ffffff"
  },
  "objects": [
    {
      "id": "obj-1",
      "type": "text",
      "x": 10, "y": 10,
      "width": 676, "height": 40,
      "rotation": 0, "opacity": 1,
      "locked": false, "visible": true,
      "color": "#000000",
      "content": "{{name}}",
      "fontFamily": "Burnmark Sans",
      "fontSize": 24,
      "fontWeight": "bold",
      "textAlign": "left",
      "verticalAlign": "top",
      "letterSpacing": 0,
      "lineHeight": 1.2,
      "invert": false,
      "wrap": true,
      "autoHeight": false
    },
    {
      "id": "obj-2",
      "type": "text",
      "x": 10, "y": 60,
      "width": 200, "height": 30,
      "rotation": 0, "opacity": 1,
      "locked": false, "visible": true,
      "color": "#ff0000",
      "content": "FRAGILE",
      "fontFamily": "Burnmark Sans",
      "fontSize": 18,
      "fontWeight": "bold",
      "textAlign": "left",
      "verticalAlign": "top",
      "letterSpacing": 0,
      "lineHeight": 1.2,
      "invert": false,
      "wrap": false,
      "autoHeight": false
    }
  ],
  "metadata": {}
}
```

**Export with assets embedded** (for sharing/portability):
```typescript
await designer.exportBundled(); // .zip containing .label + all referenced assets
```

---

## 15. CLI (`burnmark-cli`)

Full-featured CLI. Unlike the thin driver CLIs, this has access to the full
render pipeline including Canvas fonts, barcodes, templates, CSV batch,
and multi-colour support.

### 15.1 Commands

```
burnmark print --template label.label --csv cards.csv --printer usb://brother-ql
burnmark print --template badge.label --var name="Mannes" --printer tcp://192.168.1.42
burnmark render --template label.label --output preview.png
burnmark render --template label.label --csv data.csv --output labels.pdf
burnmark render --template label.label --sheet avery-l7160 --csv data.csv --output sheet.pdf
burnmark validate --template label.label --csv data.csv
burnmark list-printers
burnmark list-sheets
```

### 15.2 Flags

```
--template <path>        .label file
--csv <path>             CSV for batch mode
--var key=value          single variable (repeatable)
--printer usb|tcp://<ip> transport (auto-detects printer family)
--density light|normal|dark
--delay <ms>             delay between labels in batch (default 500)
--dry-run                render only, do not print
--output <path>          output file (PNG, PDF)
--sheet <code>           sheet template code for sticker sheet export
--rows <range>           e.g. 1-50 or 1,3,7 for partial batch
```

### 15.3 Binary

```js
#!/usr/bin/env node
import('../dist/index.js').then(m => m.run());
```

`package.json` bin field: `{ "burnmark": "./bin/burnmark.js" }`

### 15.4 Dependencies

```json
{
  "name": "burnmark-cli",
  "dependencies": {
    "@burnmark-io/designer-core": "workspace:*",
    "commander": "^12.0.0",
    "chalk": "^5.0.0",
    "ora": "^8.0.0"
  },
  "peerDependencies": {
    "@thermal-label/labelmanager-node": ">=0.1.0",
    "@thermal-label/labelwriter-node": ">=0.1.0",
    "@thermal-label/brother-ql-node": ">=0.1.0"
  },
  "peerDependenciesMeta": {
    "@thermal-label/labelmanager-node": { "optional": true },
    "@thermal-label/labelwriter-node": { "optional": true },
    "@thermal-label/brother-ql-node": { "optional": true }
  }
}
```

**Driver discovery via dynamic `import()`** — the CLI does NOT hardcode
driver dependencies. Each driver is an optional peer dep. At runtime:

```typescript
async function discoverDrivers(): Promise<PrinterAdapter[]> {
  const drivers = [];
  try { drivers.push(await import('@thermal-label/labelmanager-node')); } catch {}
  try { drivers.push(await import('@thermal-label/labelwriter-node')); } catch {}
  try { drivers.push(await import('@thermal-label/brother-ql-node')); } catch {}
  return drivers;
}
```

Users install only the drivers they need:
```bash
pnpm add burnmark-cli @thermal-label/brother-ql-node
# CLI auto-discovers brother-ql, doesn't error on missing labelwriter/labelmanager
```

Adding a new driver package in the future does not require a CLI release —
just add it to `peerDependencies` as optional.

---

## 16. Framework Bindings

**Deferred to follow-up.** Vue composable and React hook are out of scope for
v1 to avoid framework reactivity decisions mid-build. See:
- `designer-core-amendment-bindings.md`

Key design note for the bindings (when built):
- **Selection lives in the binding layer, not core.** The composable/hook
  manages its own `selection: Ref<string[]>` / `selection: string[]` state.
  Core's `LabelDesigner` has no concept of selection.
- The binding wraps core events in framework-native reactivity
  (`ref`/`watch` for Vue, `useState`/`useEffect` for React).
- The `bitmap` reactive property auto-updates (debounced 200ms) on document
  changes and handles `'error'` events from the render pipeline.

---

## 17. CI/CD

### `ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    name: CI
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: pnpm/action-setup@v5
        with:
          version: 9

      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Format check
        run: pnpm prettier --check "packages/**/*.ts"

      - name: Test with coverage
        run: pnpm test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v5
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          flags: unittests
          fail_ci_if_error: true

      - name: Build
        run: pnpm build
```

### `release.yml`

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write
  id-token: write

jobs:
  release:
    name: Publish & Release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v5
        with:
          version: 9

      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Test
        run: pnpm test

      - name: Publish
        run: pnpm release

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
          make_latest: true
```

### `docs.yml`

```yaml
name: Docs

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    name: Deploy docs
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v6

      - uses: pnpm/action-setup@v5
        with:
          version: 9

      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm build

      - name: Generate API reference
        run: pnpm docs:api

      - name: Build docs
        run: pnpm docs:build

      - uses: actions/upload-pages-artifact@v5
        with:
          path: docs/.vitepress/dist

      - uses: actions/deploy-pages@v5
        id: deployment
```

---

## 18. Testing Requirements

### Unit tests (Vitest)

- Document model: CRUD, z-order, serialisation round-trip, colour field default
- Colour pipeline: `flattenForPrinter` with single-colour capabilities, two-colour
  capabilities, overlap resolution (black wins), grey → dithered black
- Template engine: substitution, missing variables, edge cases
- Barcode validation: invalid data for each format, minimum size
- CSV parsing: delimiters, quoted fields, missing headers, empty rows
- History: undo/redo stack, max depth, state isolation

### Render tests (Vitest + Node.js renderer)

- Text rendering: font metrics, wrapping, alignment, multiline, colour
- Image rendering: fit modes, per-object threshold, per-object dithering
- Barcode rendering: one per category, correct dimensions
- Shape rendering: fill, stroke, corner radius
- Continuous label: auto-height from content bounds
- Multi-colour render: objects separated correctly into planes
- Batch rendering: 100-row CSV, verify count and memory stability
- Opacity: composited correctly, flattened to dithered 1bpp

### Integration tests (gated on `INTEGRATION=1`)

- Full print cycle: render → bitmap → USB → physical printer
- Requires hardware; skipped in CI

---

## 19. Implementation Sequence

**v1 scope: `core` + `cli` only.** Framework bindings (Vue, React) and full
VitePress docs are follow-up phases — see amendment files. This avoids
framework reactivity decisions mid-build and keeps focus on validating the
core API surface.

```
1. Scaffold
   - LICENSE, .github/FUNDING.yml
   - Root package.json, eslint.config.js, tsconfig.base.json
   - pnpm-workspace.yaml, .gitignore
   - .changeset/ directory
   - GitHub Actions: ci.yml, release.yml, docs.yml
   - Root README.md with badges
   - PROGRESS.md with all steps and substeps as checkboxes
   - pnpm install — must complete without errors

2. @burnmark-io/designer-core — Document Model
   - package.json + README.md
   - src/types.ts — all types including colour model, BarcodeFormat export
   - src/document.ts — LabelDocument, CanvasConfig
   - src/objects.ts — all object types (BaseObject with color: string)
   - src/designer.ts — LabelDesigner class (NO selection — that's UI state)
   - src/serialisation.ts — toJSON/fromJSON, .label format
   - src/migration.ts — migrateDocument with version registry (v1 = identity)
   - src/__tests__/ — CRUD, z-order, serialisation round-trip, migration
   - Gate: typecheck + lint + test + build

3. @burnmark-io/designer-core — Template Engine
   - src/template.ts — applyTemplate, extractPlaceholders, validateVariables
   - src/csv.ts — parseCsv, CsvData (papaparse)
   - src/__tests__/ — substitution, validation, CSV parsing edge cases
   - Gate: typecheck + lint + test + build

4. @burnmark-io/designer-core — Render Pipeline
   - src/render/canvas.ts — createCanvas (OffscreenCanvas required, @napi-rs/canvas fallback)
   - src/render/text.ts — text renderer with font, size, alignment, wrapping
   - src/render/image.ts — image renderer with per-object fit/threshold/dither
   - src/render/barcode.ts — BarcodeEngine (bwip-js)
   - src/render/shape.ts — rectangle, ellipse, line
   - src/render/group.ts — recursive group rendering
   - src/render/pipeline.ts — orchestrates full render pass, emits 'error' events
   - src/render/colour.ts — flattenForPrinter, explicit cssMatch only (no heuristics),
     overlap resolution (black wins)
   - src/__tests__/ — render tests, colour pipeline (single + two-colour),
     continuous label, opacity warning on bitmap target
   - Gate: typecheck + lint + test + build

5. @burnmark-io/designer-core — Fonts + Assets
   - src/fonts.ts — FontLoader interface + browser/Node implementations
   - src/fonts/bundled/ — Inter, JetBrains Mono, Bitter, Barlow Condensed (WOFF2)
   - src/assets.ts — AssetLoader interface
   - src/__tests__/ — font loading, fallback, system font warning
   - Gate: typecheck + lint + test + build

6. @burnmark-io/designer-core — Export
   - src/export/png.ts — Canvas.toBlob
   - src/export/pdf.ts — jsPDF, single + multi-page batch (full colour)
   - src/export/sheet.ts — SheetTemplate type, exportSheet tiling
   - src/export/bundle.ts — .zip with .label + assets
   - src/__tests__/ — export dimensions, multi-page count, sheet tiling
   - Gate: typecheck + lint + test + build

7. @burnmark-io/designer-core — Printer Adapter + Batch
   - src/printer.ts — PrinterAdapter interface, PrinterCapabilities,
     SINGLE_COLOR and TWO_COLOR_BLACK_RED presets
   - src/batch.ts — renderBatch async generator yielding BatchResult with planes
   - src/__tests__/ — batch rendering memory stability, multi-plane output
   - Gate: typecheck + lint + test + build

8. burnmark-cli
   - package.json + README.md
   - Dynamic driver discovery via optional peerDependencies
   - All commands: print, render, validate, list-printers, list-sheets
   - Tests (mock drivers)
   - Gate: typecheck + lint + test + build
   - Publish dry-run: verify `types: "./src/index.ts"` works for workspace
     consumers AND `exports` works for published consumers

9. Minimal docs
   - VitePress config
   - index.md — landing page with install, quick start, API overview
   - Getting started page — scripting guide, CLI usage
   - Gate: docs:build completes without errors

10. Final
    - Run pnpm test:coverage — verify 90% thresholds
    - Verify all PROGRESS.md checkboxes ticked
    - Verify ci.yml passes locally

Follow-up (separate amendment documents):
    - designer-core-amendment-bindings.md — Vue composable + React hook
    - designer-core-amendment-docs.md — full VitePress docs site
```

---

## 20. Key Constraints & Agent Notes

- **Do not implement bitmap conversion** — delegate to `@mbtech-nl/bitmap`.
- **Colour model:** `color` is a CSS string on every object, not an enum.
  Do not limit to `'black' | 'red'`. Flattening uses explicit `cssMatch` only
  — no RGB heuristics, no "is it red-ish" guessing. Unmatched colours go to
  the default plane (black).
- **Opacity:** composited on Canvas via `ctx.globalAlpha`. Produces dithered
  stipple on thermal print output. Emit `'error'` event (as warning) when
  rendering sub-1.0 opacity objects to bitmap. Works correctly for PNG/PDF.
- **Selection is NOT in core.** Selection is UI state — it belongs in the
  Vue composable / React hook / consuming app. `LabelDesigner` manages
  document state and rendering only.
- **`document` property** — returns `LabelDocument` (not `Readonly<>`).
  Deep freeze in debug mode if desired, but don't pretend shallow `Readonly`
  protects anything. Document that direct mutation is unsupported.
- **Document versioning:** `migrateDocument()` must exist from day one with
  a version registry. v1 is identity. Every future schema change increments
  version and registers a migration function.
- **`BarcodeFormat` must be exported** — it's used in `BarcodeObject.format`
  which is part of the public document model. Use underscores not hyphens
  for identifiers (`gs1_128` not `gs1-128`).
- **`LabelSummary` must be defined** — it's used in `LabelStore.list()`.
- **`OffscreenCanvas` is required** in browsers (Safari 16.4+, Chrome 69+,
  Firefox 105+). Do not fall back to `<canvas>` DOM element — that breaks
  the headless design goal.
- **Error event:** `'error'` is a `DesignerEvent`. Render failures, missing
  fonts, invalid barcode data, opacity warnings — all emitted as error events.
  Consuming apps must handle these.
- **CLI driver coupling:** drivers are optional peer dependencies discovered
  via dynamic `import()` at runtime. Adding a new driver does not require a
  CLI release. Users install only the drivers they need.
- **Per-object dithering:** `ImageObject` has its own `threshold` and `dither`.
  Apply per-image during render, not globally.
- **Fonts:** Inter, JetBrains Mono, Bitter, Barlow Condensed. WOFF2 subset,
  under 50KB each. Include OFL license per font.
- **`@napi-rs/canvas`** is optional peer dep — Node.js only.
- **`bwip-js`** is a runtime dependency.
- **`jsPDF`** is a runtime dependency.
- **`papaparse`** is a runtime dependency.
- **`pnpm prettier --check`** in CI.
- **`publishConfig: { access: "public" }`** in every package.json.
- **`types: "./src/index.ts"`** in core package.json — verify with publish
  dry-run that this works for both workspace and published consumers.
- **Coverage thresholds enforced only at final step.**
- **All READMEs must be publish-ready** per section 3.8.
- **Changesets** for versioning.
- **`sideEffects: false`** in all package.json files.
- **Preview is not core's responsibility** — core produces bitmaps, the
  consuming app displays them.
- **v1 scope is core + cli only.** Vue/React bindings and full docs are
  follow-up amendments.