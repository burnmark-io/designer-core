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

## Step 4: @burnmark-io/designer-core — Render Pipeline

- [ ] src/render/canvas.ts — createCanvas abstraction
- [ ] src/render/text.ts — text renderer
- [ ] src/render/image.ts — image renderer with per-object fit/threshold/dither
- [ ] src/render/barcode.ts — BarcodeEngine (bwip-js)
- [ ] src/render/shape.ts — rectangle, ellipse, line
- [ ] src/render/group.ts — recursive group rendering
- [ ] src/render/pipeline.ts — orchestrates full render pass
- [ ] src/render/colour.ts — flattenForPrinter, matchColourToPlane (explicit only)
- [ ] __tests__ — render tests, colour pipeline, continuous label, opacity warning
- [ ] Gate: typecheck + lint + test + build

## Step 5: @burnmark-io/designer-core — Fonts + Assets

- [ ] src/fonts.ts — FontLoader interface + browser/Node implementations
- [ ] src/fonts/bundled/ — Inter, JetBrains Mono, Bitter, Barlow Condensed
- [ ] src/assets.ts — AssetLoader interface
- [ ] __tests__ — font loading, fallback, system font warning
- [ ] Gate: typecheck + lint + test + build

## Step 6: @burnmark-io/designer-core — Export

- [ ] src/export/png.ts
- [ ] src/export/pdf.ts — jsPDF, single + multi-page
- [ ] src/export/sheet.ts — SheetTemplate type, exportSheet
- [ ] src/export/bundle.ts — .zip with .label + assets
- [ ] __tests__ — export dimensions, multi-page PDF, sheet tiling
- [ ] Gate: typecheck + lint + test + build

## Step 7: @burnmark-io/designer-core — Printer Adapter + Batch

- [ ] src/printer.ts — PrinterAdapter interface, PrinterCapabilities, presets
- [ ] src/batch.ts — renderBatch async generator
- [ ] __tests__ — batch rendering memory stability, multi-plane output
- [ ] Gate: typecheck + lint + test + build

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
