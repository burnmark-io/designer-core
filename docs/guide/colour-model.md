# Colour model

designer-core's most subtle design decision: **objects store real CSS
colours; the output pipeline flattens them to printer planes on demand.**
No heuristics. No RGB distance metrics. No surprises.

This page explains the pipeline end-to-end and walks through the edge
cases that trip people up.

## Design philosophy

A thermal printer's firmware thinks in planes — on a Brother QL800, the
"black" and "red" planes are literally separate 1bpp bitmaps sent over
the wire. Most label-design tools push that constraint up into the
document model: objects have a "colour" field that takes the values
`black` or `red`.

designer-core does the opposite. Objects hold real CSS colours
(`#ff0000`, `crimson`, `rgb(51, 51, 51)`). The mapping to printer planes
is a property of the **capabilities set** passed to the render step. The
same document renders one way on a single-colour LabelWriter and another
way on a two-colour QL800, without any document-level edits.

Two consequences:

- **PNG/PDF export keeps full colour.** No flattening happens during
  `exportPng()` or `exportPdf()` — those are for screens, mockups, and
  client previews.
- **Thermal output is deterministic.** Given the same capabilities set,
  a given CSS colour always maps to the same plane. No "oh it looked
  pink on my screen but it went to black on the printer" stories.

## `PrinterCapabilities`

```ts
interface PrinterCapabilities {
  colors: PrinterColor[];
}

interface PrinterColor {
  name: string; // plane name — e.g. 'black', 'red'
  cssMatch: string[]; // exact CSS colour strings, or ['*'] for wildcard
}
```

Two presets ship out of the box:

```ts
import { SINGLE_COLOR, TWO_COLOR_BLACK_RED } from '@burnmark-io/designer-core';

// Single-colour thermal (LabelWriter, most Brother QL models):
SINGLE_COLOR ===
  {
    colors: [{ name: 'black', cssMatch: ['*'] }],
  };

// Two-colour Brother QL black/red (DK-22251 tape):
TWO_COLOR_BLACK_RED ===
  {
    colors: [
      { name: 'black', cssMatch: ['*'] },
      { name: 'red', cssMatch: ['#ff0000', '#f00', 'red', '#cc0000' /* … */] },
    ],
  };
```

Matching is **first non-wildcard plane wins**. If nothing non-wildcard
matches, the first plane with `'*'` in `cssMatch` gets the object.
Strings are compared case-insensitively and trimmed.

Build your own for a four-colour industrial printer:

```ts
import { type PrinterCapabilities } from '@burnmark-io/designer-core';

const CMYK_THERMAL: PrinterCapabilities = {
  colors: [
    { name: 'cyan', cssMatch: ['#00ffff', 'cyan'] },
    { name: 'magenta', cssMatch: ['#ff00ff', 'magenta'] },
    { name: 'yellow', cssMatch: ['#ffff00', 'yellow'] },
    { name: 'black', cssMatch: ['*'] },
  ],
};
```

## `flattenForPrinter()` — the flattening step

```ts
import { flattenForPrinter, TWO_COLOR_BLACK_RED } from '@burnmark-io/designer-core';

const planes = await flattenForPrinter(designer.document, TWO_COLOR_BLACK_RED);
// planes is a Map<string, LabelBitmap> — one 1bpp bitmap per plane name.
const black = planes.get('black');
const red = planes.get('red');
```

`flattenForPrinter(doc, caps)` is a thin wrapper over `renderPlanes` —
kept as a top-level symbol because it reads better in driver code. The
designer's own `designer.renderPlanes(caps)` is the instance-method
equivalent when you already have a designer.

### Overlap resolution

When a non-default plane and the wildcard plane would both set a pixel,
the non-default plane wins and that pixel is cleared from the wildcard
plane. This matches Brother QL firmware's collision behaviour — a red
pixel on top of a black pixel still prints as red, not "both".

## Two-colour walkthrough

A shipping label with a black address block and a red "FRAGILE" warning:

```ts
import { LabelDesigner, flattenForPrinter, TWO_COLOR_BLACK_RED } from '@burnmark-io/designer-core';

const designer = new LabelDesigner({
  canvas: { widthDots: 696, heightDots: 400, dpi: 300 },
});

designer.add({
  type: 'text',
  x: 20,
  y: 20,
  width: 656,
  height: 200,
  rotation: 0,
  opacity: 1,
  locked: false,
  visible: true,
  color: '#000000',
  content: 'Bol.com\nPapendorpseweg 100\n3528 BJ Utrecht',
  fontFamily: 'Burnmark Sans',
  fontSize: 36,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'left',
  verticalAlign: 'top',
  letterSpacing: 0,
  lineHeight: 1.3,
  invert: false,
  wrap: true,
  autoHeight: false,
});

designer.add({
  type: 'text',
  x: 20,
  y: 260,
  width: 656,
  height: 120,
  rotation: 0,
  opacity: 1,
  locked: false,
  visible: true,
  color: '#ff0000',
  content: 'FRAGILE',
  fontFamily: 'Burnmark Sans',
  fontSize: 80,
  fontWeight: 'bold',
  fontStyle: 'normal',
  textAlign: 'center',
  verticalAlign: 'middle',
  letterSpacing: 4,
  lineHeight: 1,
  invert: false,
  wrap: false,
  autoHeight: false,
});

const planes = await flattenForPrinter(designer.document, TWO_COLOR_BLACK_RED);

// Send to a Brother QL driver:
//   await adapter.print(planes);
```

The address block's `#000000` doesn't match any entry in the red plane's
`cssMatch`, so it falls through to the black (wildcard) plane. The
FRAGILE text's `#ff0000` is an exact match for the red plane's first
entry, so it lands there. The driver gets two 1bpp bitmaps and feeds
them to the printer as separate colour passes.

## Grey → stipple

Thermal printers can't print grey. When a non-matching non-pure-colour
ends up on a 1bpp plane, the bitmap pipeline applies Floyd–Steinberg
dithering to approximate tone with a stipple pattern.

```ts
designer.add({
  type: 'text',
  // …
  color: '#808080', // 50% grey
  content: 'GREY TEXT',
});

const bitmap = await designer.renderToBitmap();
// The "grey" text becomes a checkerboard-ish stipple on the 1bpp bitmap.
```

Here's what `#808080` text actually looks like after the pipeline runs
(upscaled 2× so the individual dots are visible):

![Grey text dithered to a stipple pattern](/assets/grey-dither-example.png)

This is usually fine for diagrams and watermarks, but unreadable for
body text at normal font sizes. If you care about legibility, use
`#000000` or configure a second plane that matches your grey value.

## Opacity → stipple

Opacity is composited in full-colour space _before_ the 1bpp conversion.
`opacity: 0.5` on black text means Canvas composites the glyph as 50%
black over the white background, yielding mid-grey pixels. The bitmap
step then dithers those mid-grey pixels back to a stipple pattern.

```ts
designer.add({
  type: 'text',
  // …
  color: '#000000',
  opacity: 0.5,
  content: 'OPACITY 0.5',
});
```

Output after 1bpp dithering:

![Black text at 0.5 opacity dithered to a stipple pattern](/assets/opacity-stipple-example.png)

This is almost never what people want on a thermal printer.
**Recommendation: leave `opacity: 1.0` unless you're intentionally
rendering a watermark.** If you want a lighter visual weight, use a
thinner font or reduce the font size — both produce crisper thermal
output than a dithered solid.

## Unmatched colours

If you use a colour that's not in any non-wildcard `cssMatch` list, it
falls through to the default (wildcard) plane. This is predictable, not
surprising:

```ts
designer.add({
  type: 'text',
  color: '#ff6633', // orange — not matched by TWO_COLOR_BLACK_RED's red plane
  content: 'SALE',
  // …
});

const planes = await flattenForPrinter(doc, TWO_COLOR_BLACK_RED);
// The SALE text is on planes.get('black'), not planes.get('red').
```

If you expected that object on the red plane, extend the capabilities
set:

```ts
const TWO_COLOR_RED_EXTENDED: PrinterCapabilities = {
  colors: [
    { name: 'black', cssMatch: ['*'] },
    {
      name: 'red',
      cssMatch: [...TWO_COLOR_BLACK_RED.colors[1].cssMatch, '#ff6633', 'orange'],
    },
  ],
};
```

No code changes to the document are needed — same `.label` file, new
capabilities, different output.

## PNG/PDF export keeps full colour

```ts
import { exportPng, exportPdf } from '@burnmark-io/designer-core';

const blob = await exportPng(designer.document); // full CSS colour
const pdf = await exportPdf(designer.document); // full CSS colour
```

These paths never call the flattening step. A `#808080` text object in
the document becomes 50% grey pixels in the PNG — no stipple. This is
the right behaviour for on-screen previews, PDFs sent to a customer,
and mockups in a design review.

The flattening happens only when you ask for a bitmap:

- `designer.renderToBitmap()` — single-colour, returns one `LabelBitmap`
- `designer.renderPlanes(capabilities)` — multi-colour, returns a map
- `flattenForPrinter(doc, caps)` — the free-function form

See [Rendering](/guide/rendering) for the full pipeline.
