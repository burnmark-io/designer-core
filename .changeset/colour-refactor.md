---
'@burnmark-io/designer-core': minor
'@burnmark-io/designer-vue': minor
'@burnmark-io/designer-react': minor
'burnmark-cli': minor
---

Drop printer colour knowledge from designer-core — render full RGBA only.

Colour separation, 1bpp conversion, and per-plane bitmap generation now
live in the driver layer (`@thermal-label/*-node@^0.2.0`). Designer-core
becomes smaller and printer-agnostic.

**Breaking changes:**

- `@burnmark-io/designer-core`
  - Removed: `PrinterCapabilities`, `PrinterColor`, `SINGLE_COLOR`,
    `TWO_COLOR_BLACK_RED`, `matchColourToPlane`, `flattenForPrinter`,
    `renderPlanes` / `renderPlaneImages` / `renderPlanesFn` exports.
  - Removed: `LabelDesigner.renderPlanes()`. Use `printer.createPreview(rgba)`
    on a driver adapter (or `createPreviewOffline()` from the driver core
    package) for multi-colour preview.
  - Removed: local `PrinterAdapter`, `PrinterStatus`, `PrintOptions` —
    import from `@thermal-label/contracts` instead.
  - `BatchResult.planes: Map<string, LabelBitmap>` → `BatchResult.image: RawImageData`.
  - `renderBatch(designer, rows)` — `capabilities` parameter dropped.
  - `LabelStore` / `LabelSummary` / `AssetStore` moved from `printer.ts`
    to `storage.ts` (re-exports unchanged).
  - `renderToBitmap()` now dithers `renderFull()` output directly —
    behaviour unchanged for single-colour workflows (verified pixel-stable
    against committed `docs/assets/*.png`).

- `@burnmark-io/designer-vue` / `@burnmark-io/designer-react`
  - Removed: `capabilities` option from `useLabelDesigner`.
  - Removed: `planes` ref/state from the return value.
  - The composable/hook always renders a single-colour 1bpp preview via
    `renderToBitmap()`. Apps that want a driver-accurate multi-colour
    preview should call `printer.createPreview(rgba)` themselves with
    RGBA from `designer.render()`.

- `burnmark-cli`
  - `print` command now feeds `RawImageData` to `printer.print(image, media, opts)`
    — driver handles colour separation and 1bpp internally.
  - Bumped `@thermal-label/*-node` peer range to `>=0.2.0` (now uses each
    driver's `discovery: PrinterDiscovery` singleton instead of the
    legacy `createAdapter(url)` factory).
  - Added `serialport` as a direct dep to work around an upstream eager
    import in `@thermal-label/transport/node`.
