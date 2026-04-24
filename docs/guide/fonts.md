# Fonts

designer-core ships four bundled font families with branded names, so
`.label` files stay portable — a font called `Burnmark Sans` resolves
the same way everywhere the core package is installed. Users reference
those names in their documents, not the underlying typefaces.

Custom fonts can be loaded at runtime via `registerFont()`, and in the
browser any installed system font is reachable by name because Canvas
uses the OS font stack.

## Bundled fonts

Four families, four open-licensed typefaces:

| Family (use this name) | Underlying typeface | License | Good for                                |
| ---------------------- | ------------------- | ------- | --------------------------------------- |
| `Burnmark Sans`        | Inter               | SIL OFL | Body text, labels, most UI              |
| `Burnmark Mono`        | JetBrains Mono      | SIL OFL | Barcodes with readable text, SKUs, code |
| `Burnmark Serif`       | Bitter              | SIL OFL | Long-form or classic-feel labels        |
| `Burnmark Narrow`      | Barlow Condensed    | SIL OFL | Tight layouts, long names               |

```ts
import { BUNDLED_FONTS, type BundledFontFamily } from '@burnmark-io/designer-core';

// Use the branded family name anywhere you'd put a CSS font-family:
designer.add({
  type: 'text',
  // …
  fontFamily: 'Burnmark Sans',
});

// Inspect the mapping at runtime:
console.log(BUNDLED_FONTS['Burnmark Sans']);
// → { family: 'Burnmark Sans', actualFont: 'Inter', license: 'OFL' }
```

The four family names are the **only** bundled values you should
reference in `.label` files. If you write `'Inter'` directly, the
document is no longer self-contained — your machine will render it
because Inter is installed, but someone else's won't.

## `registerFont()` — load a custom font

```ts
import { registerFont } from '@burnmark-io/designer-core';

// From a URL (browser or Node):
await registerFont('Acme Display', '/fonts/acme-display.woff2');

// From a Uint8Array / ArrayBuffer (Node, after reading a file):
import { readFile } from 'node:fs/promises';
const buf = await readFile('./fonts/acme-display.ttf');
await registerFont('Acme Display', buf);
```

The family name is whatever you want to reference in your documents —
pick something unambiguous. Subsequent `TextObject.fontFamily` values
that reference `'Acme Display'` will use the registered file.

### Browser

Uses the [Font Loading API](https://developer.mozilla.org/docs/Web/API/CSS_Font_Loading_API).
`registerFont` creates a `FontFace`, awaits its `load()`, and adds it
to `document.fonts`. URLs, `ArrayBuffer`, and `Uint8Array` sources all
work.

### Node.js

Uses `@napi-rs/canvas`'s `GlobalFonts.register(...)`. Strings are
treated as filesystem paths (`registerFromPath`); byte buffers are
registered directly. `@napi-rs/canvas` must be installed as an optional
peer — it is on the standard Node.js install path.

## Querying loaded fonts

```ts
import { isFontLoaded, listFonts } from '@burnmark-io/designer-core';

isFontLoaded('Burnmark Sans'); // true if the bundled font has been loaded at least once
isFontLoaded('Acme Display'); // true after registerFont() completes

listFonts();
// FontDescriptor[]:
//   [{ family: 'Burnmark Sans', source: 'bundled', bundledId: 'Burnmark Sans' },
//    { family: 'Acme Display',   source: 'user' }]
```

`listFonts()` returns the known-to-the-designer fonts. In the browser,
installed system fonts don't appear in the list — they're available
implicitly but not tracked, because Canvas will pick them up by name
whether you registered them or not.

## System fonts

### Browser

Any font installed on the user's device is reachable by name. Setting
`fontFamily: 'Helvetica Neue'` on a `TextObject` works on macOS
automatically. You can't detect whether a given system font is
installed before rendering — there's no cross-browser reliable API for
that, beyond reading pixel widths after a test render. In practice, fall
back to a bundled family for documents that must render identically
everywhere.

### Node.js

System fonts are **not** available in Node.js. `@napi-rs/canvas` ships
with its own font registry and doesn't read from `/usr/share/fonts` or
the user's home directory. Every font that isn't bundled must be
explicitly registered via `registerFont()` before rendering.

This is deliberate — CI runs, Docker containers, and AWS Lambda would
otherwise render labels using whatever fonts happen to be present on
the host, which breaks reproducibility.

## Fallback behaviour

When a `TextObject.fontFamily` references a font the loader has never
seen, the default loader:

1. Emits a warning via the render-pipeline `onWarning` callback —
   surfaced as a `'error'` event on the designer with a `RenderWarning`
   payload (`{ code: 'font.missing', message: '…', objectId: '…' }`).
2. Falls back to `Burnmark Sans` (Inter).

The fallback keeps your pipeline producing output instead of crashing
silently or throwing. Watch the warning stream in any long-running
batch:

```ts
designer.on('error', payload => {
  if ('code' in payload && payload.code === 'font.missing') {
    console.warn(`Font fallback: ${payload.message} (object ${payload.objectId})`);
  }
});
```

## Font subsetting

The bundled WOFF2 subsets ship with Latin + Latin Extended coverage
(approximately Western European + Turkish + Central European + Baltic
languages). Subsetting keeps the core package install size small — a
full Inter weight is ~180 KB, the Latin subset is ~30 KB.

If your labels need characters outside this range (Cyrillic, Greek,
CJK, Hebrew, Arabic), register the full-coverage file yourself:

```ts
await registerFont('Noto Sans CJK', '/fonts/NotoSansCJK-Regular.otf');
```

Or load a full-weight Inter in place of the subset:

```ts
await registerFont('Burnmark Sans', '/fonts/Inter-Full-Regular.woff2');
// Subsequent uses of 'Burnmark Sans' use this file instead of the bundled subset.
```

Re-registering with the same family name replaces the earlier entry.

## OFL license

All four bundled families ship under the [SIL Open Font License 1.1](https://openfontlicense.org/).
In plain terms:

- You may use, redistribute, and bundle the fonts (including in
  commercial products and closed-source applications).
- You may not sell the fonts by themselves.
- If you redistribute the fonts as part of a software package (which
  `@burnmark-io/designer-core` does), the OFL license text must travel
  with them — the file is included in the core package's `dist/fonts/`.
- The "Reserved Font Name" clause means you cannot ship a modified
  version under the same name as the original — which is why we
  rebrand them as `Burnmark Sans/Mono/Serif/Narrow` in the first
  place.

In practice: if you redistribute your app with `@burnmark-io/designer-core`,
you're OFL-compliant out of the box.
