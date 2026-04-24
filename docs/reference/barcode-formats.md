# Barcode formats

Every value accepted by `BarcodeObject.format` is listed below. The
public `BarcodeFormat` union is exported from `@burnmark-io/designer-core`
and covers 44 formats from five categories.

For usage patterns (size, colour, validation, `QRContent` helpers) see
the [Barcodes guide](/guide/barcodes).

For advanced per-format options not exposed through `BarcodeOptions`,
consult the [bwip-js BWIPP documentation](https://bwipp.metafloor.com/) —
core serialises `BarcodeObject.options` directly to bwip-js's
internals, so any BWIPP option is reachable by setting the field in
the serialised `.label` JSON.

## 1D (linear) barcodes

| Format | Category | Typical use |
|---|---|---|
| `code128` | 1D | General-purpose shipping, asset tagging. Auto-selects the most efficient subset. |
| `code128a` | 1D | Code 128 forced to subset A (uppercase + control chars). |
| `code128b` | 1D | Code 128 forced to subset B (uppercase + lowercase + digits). |
| `code128c` | 1D | Code 128 forced to subset C (pairs of digits). |
| `code39` | 1D | Older industrial; uppercase letters, digits, `-. $/+%` only. |
| `code39ext` | 1D | Code 39 Extended — escape sequences for lowercase + ASCII punctuation. |
| `code93` | 1D | Denser than Code 39. Mixed case and more symbols. |
| `code11` | 1D | Telephony; digits + dash. Two checksums. |
| `codabar` | 1D | Library systems, blood banks. |
| `ean13` | 1D | Retail EAN-13 — GTIN encoding. Always 13 digits. |
| `ean8` | 1D | Short EAN-8 — small retail items. |
| `upca` | 1D | US UPC-A — 12-digit retail. |
| `upce` | 1D | Compressed UPC-E — 8-digit. |
| `itf14` | 1D | Shipping carton ITF-14 — outer-pack GTIN. |
| `interleaved2of5` | 1D | Warehousing, cardboard labelling. Even digit count required. |
| `pharmacode` | 1D | Pharma package verification. |
| `msi` | 1D | Shelf-edge retail labels. |

## 2D barcodes

| Format | Category | Typical use |
|---|---|---|
| `qrcode` | 2D | URLs, Wi-Fi, contacts, ticketing. See `QRContent`. |
| `microqr` | 2D | Small-payload QR variant — fits in ~10 × 10 modules. |
| `datamatrix` | 2D | Industrial marking, small parts. Square default. |
| `datamatrixrectangular` | 2D | Same algorithm, rectangular symbol shapes. |
| `pdf417` | 2D | Boarding passes, ID cards, dense alphanumeric payloads. |
| `micropdf417` | 2D | Compact PDF417 variant. |
| `azteccode` | 2D | Transport ticketing (SNCF, Deutsche Bahn), boarding passes. |
| `aztecrune` | 2D | Aztec Rune — short fixed-length 2D code. |
| `maxicode` | 2D | UPS shipping labels. Fixed module pattern. |
| `dotcode` | 2D | Direct-part marking on cylindrical items. |
| `hanxin` | 2D | Chinese Han Xin code — denser Chinese-character support. |
| `hibccode128` | 2D | HIBC (healthcare industry barcode) on Code 128. |

## GS1 family

| Format | Category | Typical use |
|---|---|---|
| `gs1_128` | GS1 / 1D | FNC1-led Code 128 with application identifiers. Shipping, logistics. |
| `databar` | GS1 / 1D | GS1 DataBar Omnidirectional. |
| `databarexpanded` | GS1 / 1D | GS1 DataBar Expanded — longer alphanumeric payloads. |
| `gs1qrcode` | GS1 / 2D | QR with GS1 FNC1 structure — pharma, medical. |
| `gs1datamatrix` | GS1 / 2D | Data Matrix with GS1 FNC1 structure. |
| `gs1_cc` | GS1 / 2D | GS1 Composite Component — two-stacked combinations. |

GS1 formats accept application identifiers written in parentheses:
`(01)03012345678900(17)260401(10)BATCH42`. Core passes them through to
bwip-js, which expands them to the FNC1-separated wire format.

## Postal barcodes

| Format | Category | Typical use |
|---|---|---|
| `postnet` | Postal | USPS POSTNET — legacy 5/9/11-digit ZIP. |
| `royalmail` | Postal | UK Royal Mail 4-state customer code. |
| `kix` | Postal | PostNL KIX — Dutch delivery sorting. Alphanumeric postcode + house number. |
| `onecode` | Postal | USPS Intelligent Mail Barcode (IMB). |
| `auspost` | Postal | Australia Post 4-state. |
| `japanpost` | Postal | Japan Post Customer Code. |
| `leitcode` | Postal | Deutsche Post Leitcode — routing. |
| `identcode` | Postal | Deutsche Post Identcode — tracking. |

## Specialised

| Format | Category | Typical use |
|---|---|---|
| `isbt128` | Medical | ISBT 128 — blood and tissue labelling. |
| `pzn` | Medical | Pharmazentralnummer — German pharmaceutical identifier. |

## `BarcodeOptions`

Passed as `BarcodeObject.options`. Core forwards these to the
underlying bwip-js renderer:

```ts
interface BarcodeOptions {
  scale?: number;
  rotate?: 'N' | 'R' | 'L' | 'I';
  padding?: number;
  includetext?: boolean;
  textsize?: number;
  textyoffset?: number;
  eclevel?: 'L' | 'M' | 'Q' | 'H';
  version?: number;
  rows?: number;
  columns?: number;
}
```

- **`scale`** — multiplier for bar width / module size. Default is
  chosen by bwip-js to fit the bounding box.
- **`rotate`** — `'N'` (none), `'R'` (90° CW), `'L'` (90° CCW),
  `'I'` (180°). Combines with `BaseObject.rotation`; most use cases
  want one or the other, not both.
- **`padding`** — quiet-zone size around the symbol, in module widths.
- **`includetext`** — show the human-readable text alongside the
  symbol. 1D only; 2D barcodes ignore.
- **`textsize`**, **`textyoffset`** — fine-tune the human-readable
  text.
- **`eclevel`** — error-correction level. Applies to `qrcode`,
  `microqr`, `azteccode`, `gs1qrcode`. `'L'` (7%), `'M'` (15%,
  default), `'Q'` (25%), `'H'` (30%).
- **`version`** — force a specific QR / Data Matrix / PDF417
  size. Most callers should omit and let bwip-js pick.
- **`rows`, `columns`** — PDF417 and Data Matrix layout hints.

For any option not listed here, set it directly in the serialised
`.label` JSON's `options` object — core passes unknown keys through.
The [bwip-js option reference](https://github.com/metafloor/bwip-js/wiki/BWIPP-Options-Reference)
lists every knob per format.

## Colour routing

Barcode colour follows the same rules as every other object. `color`
is a CSS string; the render pipeline routes the barcode to a printer
plane via `PrinterCapabilities.cssMatch`. Practical guidance:

- Keep barcodes `#000000` on white background unless you've tested
  with your target scanner. Red-on-white has measurably lower
  scanning reliability than black-on-white.
- Avoid `opacity < 1.0` on barcodes — the dithering in the 1bpp
  pipeline will break most scanners.
- 2D barcodes (QR, Aztec, Data Matrix) tolerate imperfect rendering
  better than 1D — built-in error correction absorbs a few damaged
  modules.

See [Colour model](/guide/colour-model) for the full matching rules.
