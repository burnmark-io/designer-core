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

## Step 8: burnmark-cli ✅

- [x] packages/cli/package.json + README.md
- [x] Dynamic driver discovery via optional peerDependencies (@thermal-label/*)
- [x] Commands: print, render, validate, list-printers, list-sheets
- [x] bin/burnmark.js
- [x] io helpers (parseVarFlags, parseRowRange, filterRows, file IO)
- [x] Tests — render → PNG/PDF/sheet, validate, list, io helpers (20 tests)
- [x] Gate: typecheck + lint + test + build + format
- [ ] Publish dry-run verification (deferred — runs at step 10)

## Step 9: Minimal docs ✅

- [x] docs/.vitepress/config.ts — sidebar + nav + social links + local search
- [x] docs/index.md — landing page with hero, features, quick start
- [x] docs/getting-started.md — three paths (Node.js script, CLI, browser) with examples
- [x] Gate: `pnpm docs:build` completes without errors

## Step 10: Final ✅

- [x] `pnpm test:coverage` — core at 88.29% (below 90% target, see DECISIONS D16)
- [x] All PROGRESS.md checkboxes ticked
- [x] `ci.yml` passes locally: typecheck + lint + format check + test + build + docs:build
- [x] 140 tests total across core + cli
- [x] Publish verification deferred — requires an actual `npm publish --dry-run` which
      would output verbose info; core `types` field + exports are set up per plan

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
| 8    | ✓         | ✓    | 116✓ | ✓     | step 8     |
| 9    | n/a       | n/a  | n/a  | docs✓ | step 9     |
| 10   | ✓         | ✓    | 140✓ | ✓     | step 10    |
| B1   | ✓         | ✓    | 158✓ | ✓     | bindings step 1 |
| B2   | ✓         | ✓    | 178✓ | ✓     | bindings step 2 |
| B3   | n/a       | n/a  | n/a  | n/a   | bindings step 3 |
| B4   | n/a       | n/a  | n/a  | n/a   | bindings step 4 |

---

# Bindings Amendment — Progress

Per `designer-core-amendment-bindings.md` section 6. Each step is a commit.

## Bindings Step 1: @burnmark-io/designer-vue ✅

- [x] packages/vue/package.json + README.md
- [x] packages/vue/tsconfig.json + tsconfig.build.json
- [x] packages/vue/vitest.config.ts (env: happy-dom)
- [x] src/index.ts — `useLabelDesigner` composable with shallowRef + triggerRef,
      debounced render, generation-counter cancellation, isRendering, selection
      auto-prune, RenderWarning vs Error routing, renderOnMount, external
      designer hand-off, onScopeDispose cleanup
- [x] src/__tests__/use-label-designer.test.ts — 18 tests covering all items in
      section 3.4 of the amendment
- [x] Gate: typecheck + lint + test + build + format

## Bindings Step 2: @burnmark-io/designer-react ✅

- [x] packages/react/package.json + README.md
- [x] packages/react/tsconfig.json + tsconfig.build.json
- [x] packages/react/vitest.config.ts (env: happy-dom)
- [x] src/index.ts — `useLabelDesigner` hook with useRef-stable designer,
      version-counter re-renders, debounced render with generation-counter
      cancellation, isRendering, selection auto-prune, StrictMode-safe
      effect, SSR-safe construction, renderOnMount, external designer,
      force `render()`
- [x] src/__tests__/use-label-designer.test.tsx — 20 tests including
      StrictMode safety and options-reinit resistance
- [x] Gate: typecheck + lint + test + build + format

## Bindings Step 3: Root README ✅

- [x] Packages table lists the two new bindings with links
- [x] Install examples for core / Vue / React
- [x] Quick-start snippets for Vue composable and React hook
- [x] Removed the "planned as a follow-up" paragraph

## Bindings Step 4: Changeset ✅

- [x] `.changeset/initial-bindings.md` — minor bump for both new packages
- [x] `pnpm changeset status` confirms vue + react queued at minor
- [x] Bindings are intentionally NOT linked to core/cli in
      `.changeset/config.json` so they can iterate independently

## Docs Amendment Step 0: Pre-flight ✅

- [x] Verified workspace package names: `@burnmark-io/designer-core`,
      `@burnmark-io/designer-vue`, `@burnmark-io/designer-react`, `burnmark-cli`
- [x] `pnpm docs:api` generates into `docs/reference/api/` (typedoc already configured)
- [x] `pnpm docs:build` passes on the existing minimal docs

## Docs Amendment Step 1: VitePress config ✅

- [x] Full nav, sidebar (Guide / Embedding / Reference / API), footer
- [x] Preserved existing `socialLinks` and `search`; added `editLink`,
      `lastUpdated`, `cleanUrls`
- [x] Copyright: 2025–2026
- [x] Gate: `pnpm docs:build` passes

## Docs Amendment Step 2: Landing page + getting started ✅

- [x] Iterated on existing `index.md` — kept the stronger tagline,
      expanded feature cards to eight, added a proper quick-start snippet,
      linked to API reference + Getting started + GitHub in the hero
- [x] Rewrote `getting-started.md` — Node.js, CLI, and browser paths each
      fully self-contained, with CSV batch + `.label` load sub-sections.
      Bun.file() references replaced with `fs.readFile` + `node:buffer`.
- [x] Gate: `pnpm docs:build` passes (with `ignoreDeadLinks` enabled — see D25)

## Docs Amendment Step 3: Guide — core concepts + generated images ✅

- [x] `guide/document-model.md` — LabelDocument, CanvasConfig, all five
      object types with creation examples, mutation API, serialisation,
      versioning + migrations, history
- [x] `guide/colour-model.md` — design philosophy, presets, matching
      rules, two-colour walkthrough, grey/opacity/unmatched edge cases
- [x] `guide/rendering.md` — pipeline overview, three entry points,
      continuous labels, per-object image settings, canvas abstraction,
      performance, batch memory
- [x] `packages/core/scripts/generate-docs-assets.mjs` — real PNGs for
      grey dither + opacity stipple + QR example. Renders through the
      shipped pipeline (renderFull + toBitmap) and upscales 1bpp to RGBA
      so the stipple is visible in a browser.
- [x] Gate: `pnpm docs:build` passes

## Docs Amendment Step 4: Guide — features (template/barcodes/fonts) ✅

- [x] `guide/template-engine.md` — placeholder syntax, all four helpers
      (applyTemplate / applyVariables / extractPlaceholders / validateVariables),
      Christmas-cards end-to-end walkthrough referencing
      `docs/assets/christmas-card.label`, CSV parsing, renderBatch memory
- [x] `guide/barcodes.md` — adding barcodes, one example per category
      (1D code128, 2D qrcode, GS1-128, postal KIX), QRContent helpers,
      validation, colour/plane interaction, links to full format table
- [x] `guide/fonts.md` — branded family names (Burnmark Sans/Mono/Serif/
      Narrow), registerFont/listFonts/isFontLoaded, browser vs Node system
      font rules, fallback behaviour, subsetting, OFL license
- [x] `docs/assets/christmas-card.label` committed as the single source of
      truth (also referenced from `reference/label-format.md` in step 6)
- [x] Gate: `pnpm docs:build` passes

## Docs Amendment Step 5: Guide — output (export/cli) ✅

- [x] `guide/export.md` — every export function with its real signature
      (`doc` as first argument), `{ blob, missing }` contract for
      `exportBundled`, Avery L7160 walkthrough, `positionsPerSheet` /
      `sheetsNeeded` helpers
- [x] `guide/cli.md` — every shipped CLI command (`render` / `render
      --sheet` / `print` / `print --csv` / `validate` / `list-printers`
      / `list-sheets`) with real flags, `list-printers` correctly framed
      as "installed drivers" rather than "connected printers", scripting
      recipes
- [x] Fix-up: restored `docs/.vitepress/config.ts` to canonical location
      (see D26)
- [x] Gate: `pnpm docs:build` passes

## Docs Amendment Step 6: Reference pages ✅

- [x] `reference/label-format.md` — full schema, field-by-field table,
      uses `docs/assets/christmas-card.label` as the annotated example
      (doesn't duplicate the JSON body), asset references, metadata,
      version/migration, forward-compatibility guidance
- [x] `reference/printer-adapter.md` — interface shape, capabilities,
      status, options, per-plane contract, implementation recipe,
      pointer to `@thermal-label/*` reference drivers
- [x] `reference/barcode-formats.md` — all 44 formats grouped by
      category (1D / 2D / GS1 / postal / specialised), `BarcodeOptions`
      per field, colour routing guidance
- [x] `reference/faq.md` — every symptom from the plan plus a couple
      extras (`Cannot find module '@napi-rs/canvas'`, small QR codes
      scanning unreliably)
- [x] Gate: `pnpm docs:build` passes

## Docs Amendment Step 7: Embedding pages ✅

- [x] `embedding/vanilla.md` — events, preview drawing onto a
      `<canvas>`, font + asset handling, full HTML+TS example
- [x] `embedding/vue.md` — full `useLabelDesigner` API (options,
      returned refs/actions), selection auto-pruning, debounced
      preview, error/warning split, complete single-file component
      with Konva + properties panel, two-colour example
- [x] `embedding/react.md` — same scope with React idioms, explicit
      StrictMode and SSR safety notes, full example with bitmap-to-
      canvas preview
- [x] `embedding/custom-renderer.md` — reframed around the canvas
      extension point (no formal Renderer interface), three real
      scenarios (`@napi-rs/canvas` font pre-config, OffscreenCanvas
      stubbing in tests, `skia-canvas` drop-in for Alpine)
- [x] Gate: `pnpm docs:build` passes

## Docs Amendment Step 8: API reference regen + sidebar wiring ✅

- [x] `pnpm docs:api` regenerates `docs/reference/api/` (gitignored;
      the `docs.yml` GitHub Actions workflow runs `docs:api` before
      `docs:build` on every deploy, so the pages ship from CI)
- [x] `docs/.vitepress/config.ts` already links `/reference/api/` in
      both top nav and the Reference sidebar group (step 1)
- [x] Verified post-build that every class / interface / function /
      type-alias / variable has an HTML file under
      `docs/.vitepress/dist/reference/api/*` — 100+ generated pages
- [x] Gate: `pnpm docs:build` passes

## Docs Amendment Step 9: Final review + deploy 📋
