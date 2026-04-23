# designer-core — Implementation Progress

Per the plan's Section 19 implementation sequence. Each step is a commit.

## Step 1: Scaffold ✅

- [x] LICENSE
- [x] .github/FUNDING.yml
- [x] Root package.json
- [x] eslint.config.js
- [x] tsconfig.base.json
- [x] pnpm-workspace.yaml
- [x] .gitignore
- [x] .changeset/ directory
- [x] GitHub Actions: ci.yml, release.yml, docs.yml
- [x] Root README.md
- [x] `pnpm install` completes without errors
- [x] Gate: install succeeds; typecheck/lint/build no-op with no packages yet

## Step 2: @burnmark-io/designer-core — Document Model ✅

- [x] packages/core/package.json + README.md
- [x] packages/core/tsconfig.json (+ tsconfig.build.json for emit)
- [x] src/types.ts — all types including colour model, BarcodeFormat export
- [x] src/document.ts — LabelDocument, CanvasConfig
- [x] src/objects.ts — all object types
- [x] src/designer.ts — LabelDesigner class (NO selection)
- [x] src/serialisation.ts — toJSON/fromJSON
- [x] src/migration.ts — migrateDocument with version registry
- [x] src/history.ts — undo/redo stack
- [x] src/events.ts — EventEmitter
- [x] src/id.ts — UUID
- [x] src/index.ts — public exports
- [x] __tests__ — CRUD, z-order, serialisation round-trip, migration, events (25 tests)
- [x] Gate: typecheck + lint + test + build + format

## Step 3: @burnmark-io/designer-core — Template Engine ✅

- [x] src/template.ts — applyTemplate, extractPlaceholders, validateVariables, applyVariables
- [x] src/csv.ts — parseCsv, CsvData (papaparse)
- [x] __tests__ — substitution, validation, CSV parsing edge cases (22 new tests)
- [x] Gate: typecheck + lint + test + build + format

## Step 4: @burnmark-io/designer-core — Render Pipeline ✅

- [x] src/render/canvas.ts — createCanvas abstraction (OffscreenCanvas / @napi-rs/canvas)
- [x] src/render/text.ts — text renderer with wrap, alignment, vertical alignment, invert
- [x] src/render/image.ts — image renderer, fit modes (contain/cover/fill/none)
- [x] src/render/barcode.ts — BarcodeEngine via bwip-js, format map with underscore → bwip-js strings
- [x] src/render/shape.ts — rectangle (rounded), ellipse, line (h/v/diag)
- [x] src/render/group.ts — recursive group rendering, per-object translate/rotate/opacity
- [x] src/render/pipeline.ts — renderFull / renderPlaneImages / renderPlanes / toBitmap
- [x] src/render/colour.ts — SINGLE_COLOR, TWO_COLOR_BLACK_RED, matchColourToPlane, partitionByPlane
- [x] src/flatten.ts — flattenForPrinter (public function)
- [x] src/qr-content.ts — QRContent helpers (url, wifi, vcard, email, phone, sms, geo)
- [x] src/assets.ts — AssetLoader interface + InMemoryAssetLoader
- [x] __tests__ — render (14), colour pipeline (6), QR content (6), continuous label, opacity warning
- [x] Gate: typecheck + lint + test + build + format

## Step 5: @burnmark-io/designer-core — Fonts + Assets ✅

- [x] src/fonts.ts — FontLoader interface, DefaultFontLoader (browser + Node)
- [x] src/fonts/bundled/README.md — documents WOFF2 files to drop in (OFL)
- [x] src/assets.ts — done in step 4 (AssetLoader + InMemoryAssetLoader)
- [x] __tests__ — font registry, fallback behaviour, duplicate-load short-circuit (5 tests)
- [x] Gate: typecheck + lint + test + build + format
- Note: Actual WOFF2 subsets are not checked in — see DECISIONS.md D4

## Step 6: @burnmark-io/designer-core — Export ✅

- [x] src/export/png.ts — OffscreenCanvas.convertToBlob / @napi-rs/canvas toBuffer, scale option
- [x] src/export/pdf.ts — jsPDF, page per CSV row, dynamic page sizes
- [x] src/export/sheet.ts — SheetTemplate, exportSheet with tiling + multi-page support
- [x] src/export/sheet-registry.ts — BUILTIN_SHEETS (Avery L7160/L7163/L7173/L7671, Herma, Letter 30up)
- [x] src/export/bundle.ts — .zip with label.json + assets/ folder via jszip
- [x] __tests__ — export dimensions, multi-page, sheet tiling, missing assets (13 tests)
- [x] Gate: typecheck + lint + test + build + format

## Step 7: @burnmark-io/designer-core — Printer Adapter + Batch ✅

- [x] src/printer.ts — PrinterAdapter, PrinterStatus, PrintOptions, LabelStore, LabelSummary, AssetStore
- [x] src/batch.ts — renderBatch async generator
- [x] LabelDesigner.renderBatch method
- [x] __tests__ — batch rendering, multi-plane output, empty rows (5 tests)
- [x] Gate: typecheck + lint + test + build + format

## Step 8: burnmark-cli

- [ ] packages/cli/package.json + README.md
- [ ] Dynamic driver discovery via optional peerDependencies
- [ ] Commands: print, render, validate, list-printers, list-sheets
- [ ] bin/burnmark.js
- [ ] Tests (mock drivers)
- [ ] Gate: typecheck + lint + test + build
- [ ] Publish dry-run verification (workspace & published consumers)

## Step 9: Minimal docs

- [ ] VitePress config
- [ ] index.md — landing page
- [ ] getting-started.md
- [ ] Gate: docs:build completes

## Step 10: Final

- [ ] `pnpm test:coverage` — verify 90% thresholds
- [ ] All PROGRESS.md checkboxes ticked
- [ ] `ci.yml` passes locally

## Gate log

| Step | Typecheck | Lint | Test | Build | Commit |
|------|-----------|------|------|-------|--------|
| 1    | n/a       | n/a  | n/a  | n/a   | (install ✓) |
| 2    | ✓         | ✓    | 25✓  | ✓     | step 2     |
| 3    | ✓         | ✓    | 47✓  | ✓     | step 3     |
| 4    | ✓         | ✓    | 73✓  | ✓     | step 4     |
| 5    | ✓         | ✓    | 78✓  | ✓     | step 5     |
| 6    | ✓         | ✓    | 91✓  | ✓     | step 6     |
| 7    | ✓         | ✓    | 96✓  | ✓     | step 7     |
