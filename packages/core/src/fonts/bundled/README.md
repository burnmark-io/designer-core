# Bundled fonts

Four `Burnmark *` font families map to open-license typefaces. For a
publish-ready release, drop WOFF2 subsets into this directory with the
names below. The DefaultFontLoader will pick them up at runtime.

| Family | Source typeface | File |
|---|---|---|
| `Burnmark Sans` | Inter (OFL) | `burnmark-sans.woff2` |
| `Burnmark Mono` | JetBrains Mono (OFL) | `burnmark-mono.woff2` |
| `Burnmark Serif` | Bitter (OFL) | `burnmark-serif.woff2` |
| `Burnmark Narrow` | Barlow Condensed (OFL) | `burnmark-narrow.woff2` |

## Subsetting

Use `pyftsubset` (part of `fonttools`) to subset each font to Latin + Latin
Extended and convert to WOFF2:

```bash
pyftsubset Inter-Regular.ttf \
  --unicodes="U+0020-007F,U+00A0-00FF,U+0100-017F,U+0180-024F,U+0300-036F,U+2000-206F,U+20A0-20CF,U+2100-218F" \
  --flavor=woff2 \
  --output-file=burnmark-sans.woff2
```

Targets for each file are under 50KB per the plan.

## Licenses

Include each typeface's OFL license text alongside the WOFF2 file:

- `burnmark-sans.LICENSE.txt` — Inter
- `burnmark-mono.LICENSE.txt` — JetBrains Mono
- `burnmark-serif.LICENSE.txt` — Bitter
- `burnmark-narrow.LICENSE.txt` — Barlow Condensed

## Current status

No WOFF2 files are checked in. The loader warns and falls back to the
platform default font. See `DECISIONS.md` D4.
