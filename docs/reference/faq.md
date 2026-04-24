# FAQ

Common issues and how to resolve them. Organised by symptom — search
or `Ctrl+F` for the exact error message you're seeing.

## `OffscreenCanvas is not defined`

**Symptom.** Throws when calling `render`, `renderToBitmap`,
`renderPlanes`, or `exportPng` in a browser environment.

**Cause.** `OffscreenCanvas` requires Safari 16.4+, Chrome 69+, or
Firefox 105+. Older browsers don't have it.

**Fix.**

- Check the user agent and display a "browser unsupported" message in
  your UI.
- If you must support older browsers, polyfill with
  [`canvaskit-wasm`](https://github.com/google/skia#canvaskit) — `OffscreenCanvas`
  is one of the APIs CanvasKit can stand in for.

**SSR variant.** If you're hitting this in a Next.js server component
or similar SSR context, the `window` object doesn't exist on the
server. Gate render calls behind a `typeof window !== 'undefined'`
check, or do rendering in a client component / API route only.

## `Font not found, falling back to Burnmark Sans`

**Symptom.** `'error'` event fires with
`{ code: 'font.missing', message: '…' }`; the affected text renders
in Inter (the Burnmark Sans bundled font).

**Cause.** A `TextObject.fontFamily` references a font the loader has
never been told about. On Node.js this is most commonly because
system fonts aren't available — `@napi-rs/canvas` uses its own
registry. See [Fonts → System fonts](/guide/fonts#system-fonts).

**Fix.**

- If you want the font: `await registerFont('Helvetica Neue', '/fonts/helvetica.woff2');`
  before the first render.
- If the bundled font is the intended fallback, suppress the warning
  at the application boundary:

  ```ts
  designer.on('error', payload => {
    if ('code' in payload && payload.code === 'font.missing') return; // silence
    console.error(payload);
  });
  ```

- If you want to verify a font is loaded before rendering:
  `isFontLoaded('Burnmark Sans')`.

## `Barcode data validation failed`

**Symptom.** Render throws, or
`BarcodeEngine.validate()` returns `{ valid: false, errors: […] }`,
with a message from bwip-js like
`data length 12 not permitted for ean13`.

**Cause.** The `BarcodeObject.data` value violates the format's
constraints. Common offenders:

| Format    | Required                                                          |
| --------- | ----------------------------------------------------------------- |
| `ean13`   | 12 or 13 digits (bwip-js computes the check digit if you give 12) |
| `ean8`    | 7 or 8 digits                                                     |
| `upca`    | 11 or 12 digits                                                   |
| `upce`    | 6, 7, or 8 digits                                                 |
| `code39`  | uppercase + digits + `-. $/+%`; no lowercase, no punctuation      |
| `itf14`   | Even digit count                                                  |
| `gs1_128` | Well-formed application identifiers in parentheses                |

**Fix.** Use `burnmark validate --template … --csv …` to catch every
offending row before you start printing. In-app, call
`BarcodeEngine.validate()` as part of your save or preview flow.

## Opacity looks wrong on a thermal print

**Symptom.** An object with `opacity: 0.5` shows up on the printed
label as a scattered stipple pattern instead of a "lighter" version.

**Cause.** Thermal printers can't vary density within a pixel. The
1bpp pipeline dithers the composited grey pixels into a stipple.
Explained with examples on the [Colour model](/guide/colour-model#opacity-stipple)
page.

**Fix.** Unless you specifically want a watermark effect, set
`opacity: 1.0` and use a thinner font weight or smaller size for
lighter visual emphasis.

## Grey text looks speckled

**Symptom.** Text with `color: '#808080'` (or any non-black, non-matched
colour) prints as a dot pattern.

**Cause.** Same as opacity — the 1bpp pipeline has no grey. Every
non-binary colour gets dithered. This is **correct behaviour** — see
the [grey example image](/guide/colour-model#grey-stipple) on the
colour model page.

**Fix.** Use `#000000` for text that should be solid, or configure a
printer capabilities set that matches your grey value explicitly.

## "Colour didn't go to the red plane"

**Symptom.** You have a red-ish colour in an object and expected it to
print on the red plane of a two-colour printer, but it went to the
black plane instead.

**Cause.** Plane matching is **exact**. If your CSS colour isn't in the
plane's `cssMatch` list verbatim, it falls through to the wildcard
plane (`'*'`). `TWO_COLOR_BLACK_RED` matches `#ff0000`, `#f00`, `red`,
`#cc0000`, `#ff3333`, `#e60000`, `#b30000`, `#ff1a1a`, `darkred`, and
`crimson` — anything else (orange, pink, custom red hex) falls to
black.

**Fix.**

- Use one of the matched values verbatim.
- Or extend the capabilities set:

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

No document-level edits needed — the same `.label` file renders
differently against the new capabilities.

## `OffscreenCanvas width/height exceeds limit`

**Symptom.** Browser throws when rendering a very tall continuous
label.

**Cause.** Each browser caps `OffscreenCanvas` dimensions; Chrome
around 32,767 px, Firefox around 32,767 px per dimension and a total
area limit around 268 million pixels, Safari lower.

**Fix.**

- Lower `canvas.dpi` or use a smaller font size for the payload.
- Split very long batch renders across multiple labels.
- If the label is continuous (`heightDots: 0`), core's scratch canvas
  is 10,000 dots — so the label must fit in 10,000 dots of content
  height. Beyond that, either set an explicit `heightDots` or split
  into multiple labels.

## `renderBatch` memory usage is high

**Symptom.** A large CSV batch grows memory proportionally with row
count.

**Cause.** You're collecting `BatchResult` objects into an array,
which defeats the generator's per-row memory guarantees.

**Fix.** Consume the generator directly, one row at a time:

```ts
for await (const result of renderBatch(designer, csv.rows)) {
  await printer.print(result.planes);
  // `result` goes out of scope here, eligible for GC.
}
```

Don't:

```ts
// Anti-pattern — forces every RGBA + bitmap to stay in memory.
const all = await Array.fromAsync(renderBatch(designer, csv.rows));
```

See [Template engine → renderBatch memory](/guide/template-engine#renderbatch-and-memory).

## The QR code scans fine on my phone but not on a handheld scanner

**Cause.** Scanning reliability depends on module pitch (physical
size of a single QR module). Small codes are fine under a phone
camera but fail at handheld-scanner distances.

**Fix.**

- Increase the `BarcodeObject.width` / `height` until `width / modules`
  is at least 0.5 mm at the printing DPI (most retail scanners).
- Increase `eclevel` to `'Q'` or `'H'` — the code absorbs more damage,
  which helps with smudged or folded thermal tape.
- Add quiet-zone padding via `BarcodeOptions.padding`.

## `Cannot find module '@napi-rs/canvas'`

**Symptom.** Node.js render calls throw this error during dynamic
import.

**Cause.** `@napi-rs/canvas` is declared as an **optional** peer
dependency. Package managers install optional peers only under some
configurations.

**Fix.** Install it explicitly alongside core:

```bash
pnpm add @napi-rs/canvas
# or
npm install @napi-rs/canvas
```

The browser path doesn't use `@napi-rs/canvas` — this error only
appears in Node.js or Electron main-process rendering.

## `.label` file versions are confusing — do I need to migrate manually?

**No.** `fromJSON()` always runs `migrateDocument()` internally. Older
files are brought up to `CURRENT_DOCUMENT_VERSION` on load; the file
on disk stays at its original version until you `toJSON()` it back
out.

If you see `DocumentMigrationError: Document version N is newer than
supported`, the file was written by a newer version of
`@burnmark-io/designer-core` than you're running. Upgrade the package
— forward compatibility is not attempted.

## Everything I click fires `'change'` and `'historyChange'`

**Not a bug.** Every mutation (`add`, `update`, `remove`,
`setCanvas`, `reorder`, `undo`, `redo`, `clearHistory`) emits one of
each. The Vue composable and React hook react to these to trigger a
reactive re-render. Debounced rendering on top of them is already
handled — see [Embedding → Vue](/embedding/vue) and [Embedding → React](/embedding/react).

If you're consuming events in a tight loop (e.g. a migration batch),
install an event handler that does only what you need (`once` + a
counter, for instance) and don't try to debounce before reaching the
core mutation API.
