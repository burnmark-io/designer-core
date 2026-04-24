# Rendering

designer-core's render pipeline has three public entry points that
correspond to three different jobs:

| Entry point | Returns | What it's for |
|---|---|---|
| `designer.render()` | `RawImageData` (RGBA) | Full-colour preview, PNG/PDF export |
| `designer.renderToBitmap()` | `LabelBitmap` (1bpp) | Single-colour thermal output |
| `designer.renderPlanes(caps)` | `Map<string, LabelBitmap>` | Multi-colour thermal output |

All three accept an optional `variables: Record<string, string>` argument
for `{{placeholder}}` substitution. All three are async — Canvas setup
and font loading are I/O-bound.

## Pipeline overview

```
document
  │
  │  applyVariables(doc, variables)   // if provided
  ▼
resolved document
  │
  │  for each plane in capabilities:
  │    partitionByPlane(objects)       // explicit cssMatch, no heuristics
  │    create Canvas(width, height)
  │    fill background
  │    renderObjects(bucket, ctx)      // text, image, barcode, shape, group
  │    ctx.getImageData()              // RGBA
  │    if heightDots === 0:
  │      cropToContent(rgba)           // continuous labels
  ▼
Map<plane, RawImageData>
  │
  │  toBitmap(rgba, { dither: true })  // @mbtech-nl/bitmap Floyd-Steinberg
  ▼
Map<plane, LabelBitmap>                // ready for the printer adapter
```

The full-colour path (`designer.render()`) skips the partition + bitmap
steps entirely — it renders every object onto a single canvas and
returns the raw RGBA buffer.

## Single-colour path — `renderToBitmap()`

The simplest case. Every object rasterises to one plane called `'black'`.

```ts
import { LabelDesigner } from '@burnmark-io/designer-core';

const designer = new LabelDesigner({
  canvas: { widthDots: 696, heightDots: 300, dpi: 300 },
});
// …add objects…

const bitmap = await designer.renderToBitmap();
// bitmap is a LabelBitmap from @mbtech-nl/bitmap:
//   { widthPx, heightPx, data: Uint8Array }   // packed 1bpp, MSB-first per byte
```

Pass variables to substitute placeholders inline without mutating the
document:

```ts
const bitmap = await designer.renderToBitmap({
  order_id: '12345',
  name: 'Mannes',
});
```

Internally this calls `renderPlanes(SINGLE_COLOR, variables)` and grabs
the `'black'` plane. The extra layer exists for symmetry with the
multi-colour path — driver code looks the same either way.

## Multi-colour path — `renderPlanes(capabilities)`

```ts
import {
  LabelDesigner,
  TWO_COLOR_BLACK_RED,
} from '@burnmark-io/designer-core';

const designer = new LabelDesigner({ /* … */ });
// …add black and red objects…

const planes = await designer.renderPlanes(TWO_COLOR_BLACK_RED);
// Map<string, LabelBitmap>:
//   'black' → the wildcard plane (everything not explicitly matched)
//   'red'   → objects whose color matches the red cssMatch entries
```

The order of entries in `capabilities.colors` determines lookup order —
see [Colour model](/guide/colour-model) for the matching rules.

One important detail: where the wildcard plane and a non-wildcard plane
both set a pixel, the non-wildcard plane wins and the pixel is cleared
from the wildcard plane. This matches Brother QL firmware's collision
behaviour.

## Full-colour path — `render()`

```ts
const rgba = await designer.render();
// rgba: { width, height, data: Uint8ClampedArray | Uint8Array }
```

This is the RGBA that `exportPng()` and `exportPdf()` use internally.
Reach for it when you want to:

- Feed the pixels to a third-party library (e.g. `sharp`, `jimp`).
- Implement a custom `OffscreenCanvas`-based preview widget.
- Do your own dithering with different parameters.

`toBitmap()` is the bridge from RGBA back to 1bpp:

```ts
import { LabelDesigner } from '@burnmark-io/designer-core';

const rgba = await designer.render();
const bitmap = LabelDesigner.toBitmap(rgba, {
  threshold: 128,  // default
  dither: true,    // Floyd-Steinberg (default)
  invert: false,
});
```

## Continuous labels — `heightDots: 0`

When `canvas.heightDots === 0`, the renderer treats the label as a
continuous strip and crops the output to the lowest non-background row
plus a one-pixel margin. The scratch canvas height is 10,000 dots, so
anything that fits on a single thermal tape section will render
correctly.

```ts
const designer = new LabelDesigner({
  canvas: { widthDots: 696, heightDots: 0, dpi: 300 }, // continuous
});

designer.add({ type: 'text', /* …short content… */ });
const short = await designer.render();
console.log(short.height);  // auto-sized — e.g. ~80 dots

designer.add({ type: 'text', /* …long content… */ });
const long = await designer.render();
console.log(long.height);   // taller
```

The crop uses the `canvas.background` colour as the "empty" definition,
with a 4/255 tolerance per channel to accommodate minor blending at the
edges of anti-aliased glyphs.

## Per-object image settings

`ImageObject` has two fields that control how its pixels map to 1bpp
output:

```ts
designer.add({
  type: 'image',
  // …
  threshold: 160,    // 0..255 cutoff — higher = more pixels go white
  dither: false,     // hard threshold instead of Floyd-Steinberg
});
```

These are per-object because photographs and logos usually want different
treatment. A grayscale photo looks best with `dither: true`; a high-contrast
logo usually wants `dither: false, threshold: 128` for crisp edges.

## Canvas abstraction

Rendering uses `OffscreenCanvas` in browsers and `@napi-rs/canvas` in
Node.js. The choice is automatic — `core/src/render/canvas.ts` probes
`globalThis.OffscreenCanvas` at call time and falls back to the Node
implementation when it isn't available.

No configuration is needed. Two implications:

- Browsers below `OffscreenCanvas` support (Safari < 16.4) won't render.
  See the [FAQ](/reference/faq#offscreencanvas-is-not-defined) for
  options (polyfills, SSR workarounds).
- Node.js needs `@napi-rs/canvas` installed as an optional peer. If
  you've only installed core but not the canvas peer, any render call
  will throw `Cannot find module '@napi-rs/canvas'`.

If you need a non-Canvas backend (for example, running headless on
Alpine where `@napi-rs/canvas` can't install), see
[Custom renderer](/embedding/custom-renderer) for the stubbing pattern.

## Performance

Typical render times on a modern laptop (measured against the default
Node.js + `@napi-rs/canvas` setup):

| Document | Canvas | Time |
|---|---|---|
| Address label — 5 text objects | 696 × 300 | ~15 ms |
| Same, two-colour | 696 × 300 | ~30 ms |
| Full badge — text + image + QR | 696 × 400 | ~60 ms |
| Sticker sheet — 21 labels | 2480 × 3508 (A4) | ~900 ms |

Barcode rendering dominates for QR and Data Matrix codes (`bwip-js`
produces an SVG which is decoded as an `ImageBitmap`). Caching the
rendered barcode bytes and reusing the `ImageBitmap` across batch rows
is a planned optimisation — today each render call re-encodes.

## Batch memory

`renderBatch(designer, rows)` yields one `BatchResult` at a time:

```ts
import { renderBatch } from '@burnmark-io/designer-core';

for await (const result of renderBatch(designer, csv.rows)) {
  const black = result.planes.get('black');
  await printer.print(result.planes);
  // `result` goes out of scope here — eligible for GC before the next iteration.
}
```

The key is that it's an **async generator** — it does not collect
results into an array. For a 10,000-row CSV, peak memory stays close to
"one label's worth of RGBA plus one 1bpp bitmap". Collecting results
with `Array.fromAsync(renderBatch(...))` defeats this entirely; don't.

A few common pitfalls:

- Calling `renderPlanes()` in a loop without awaiting — each call buffers
  its own canvas. Await each iteration.
- Holding references to every yielded `result` in a closure (logging,
  progress UI). Extract only what you need (`result.index`, bitmap size)
  and drop the rest.
- Concurrent `renderBatch` calls on the same designer — safe in isolation,
  but every call goes through the same event emitter, so `'render'` events
  fire for both interleaved. Not wrong, just surprising.

See [Template engine](/guide/template-engine) for the full CSV batch
walkthrough.
