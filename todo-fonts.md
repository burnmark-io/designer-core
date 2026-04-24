# Font Subsetting — designer-core bundled fonts

> Steps to generate the WOFF2 font subsets for `@burnmark-io/designer-core`.
> These replace the placeholder files from D4 in the decisions log.
>
> This can be run by an agent or manually. All commands are deterministic.
> The resulting files are committed to the repo.

---

## 1. Install tooling

```bash
pip install fonttools brotli --break-system-packages
```

## 2. Download source fonts

```bash
mkdir -p /tmp/fonts && cd /tmp/fonts

# Inter (Burnmark Sans)
curl -L -o Inter-Regular.ttf \
  "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.woff2"
curl -L -o Inter-Bold.ttf \
  "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Bold.woff2"

# JetBrains Mono (Burnmark Mono)
curl -L -o JetBrainsMono-Regular.ttf \
  "https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/ttf/JetBrainsMono-Regular.ttf"
curl -L -o JetBrainsMono-Bold.ttf \
  "https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/ttf/JetBrainsMono-Bold.ttf"

# Bitter (Burnmark Serif)
curl -L -o Bitter-Regular.ttf \
  "https://github.com/googlefonts/bitter/raw/main/fonts/ttf/Bitter-Regular.ttf"
curl -L -o Bitter-Bold.ttf \
  "https://github.com/googlefonts/bitter/raw/main/fonts/ttf/Bitter-Bold.ttf"

# Barlow Condensed (Burnmark Narrow)
curl -L -o BarlowCondensed-Regular.ttf \
  "https://github.com/jpt/barlow/raw/main/fonts/ttf/BarlowCondensed-Regular.ttf"
curl -L -o BarlowCondensed-Bold.ttf \
  "https://github.com/jpt/barlow/raw/main/fonts/ttf/BarlowCondensed-Bold.ttf"
```

## 3. Download OFL licenses

```bash
curl -L -o LICENSE-inter.txt \
  "https://github.com/rsms/inter/raw/master/LICENSE.txt"
curl -L -o LICENSE-jetbrains-mono.txt \
  "https://github.com/JetBrains/JetBrainsMono/raw/master/OFL.txt"
curl -L -o LICENSE-bitter.txt \
  "https://github.com/googlefonts/bitter/raw/main/OFL.txt"
curl -L -o LICENSE-barlow.txt \
  "https://github.com/jpt/barlow/raw/main/OFL.txt"
```

## 4. Subset

Unicode ranges included:
- `U+0000-007F` — Basic Latin (ASCII)
- `U+0080-00FF` — Latin-1 Supplement (é, ü, ñ, £, ©)
- `U+0100-024F` — Latin Extended A+B (ē, ř, ș — European languages)
- `U+2000-206F` — General Punctuation (em dash, bullets, ellipsis)
- `U+20AC` — Euro sign
- `U+2190-21FF` — Arrows
- `U+2200-22FF` — Mathematical symbols
- `U+25A0-25FF` — Geometric shapes

If any file exceeds 50KB, drop the last three ranges (arrows, math, geometric).

```bash
UNICODES="U+0000-007F,U+0080-00FF,U+0100-024F,U+2000-206F,U+20AC,U+2190-21FF,U+2200-22FF,U+25A0-25FF"
FEATURES="kern,liga,calt"

# Regular variants
pyftsubset Inter-Regular.ttf \
  --output-file=burnmark-sans.woff2 --flavor=woff2 \
  --layout-features="$FEATURES" --unicodes="$UNICODES"

pyftsubset JetBrainsMono-Regular.ttf \
  --output-file=burnmark-mono.woff2 --flavor=woff2 \
  --layout-features="$FEATURES" --unicodes="$UNICODES"

pyftsubset Bitter-Regular.ttf \
  --output-file=burnmark-serif.woff2 --flavor=woff2 \
  --layout-features="$FEATURES" --unicodes="$UNICODES"

pyftsubset BarlowCondensed-Regular.ttf \
  --output-file=burnmark-narrow.woff2 --flavor=woff2 \
  --layout-features="$FEATURES" --unicodes="$UNICODES"

# Bold variants
pyftsubset Inter-Bold.ttf \
  --output-file=burnmark-sans-bold.woff2 --flavor=woff2 \
  --layout-features="$FEATURES" --unicodes="$UNICODES"

pyftsubset JetBrainsMono-Bold.ttf \
  --output-file=burnmark-mono-bold.woff2 --flavor=woff2 \
  --layout-features="$FEATURES" --unicodes="$UNICODES"

pyftsubset Bitter-Bold.ttf \
  --output-file=burnmark-serif-bold.woff2 --flavor=woff2 \
  --layout-features="$FEATURES" --unicodes="$UNICODES"

pyftsubset BarlowCondensed-Bold.ttf \
  --output-file=burnmark-narrow-bold.woff2 --flavor=woff2 \
  --layout-features="$FEATURES" --unicodes="$UNICODES"
```

## 5. Verify sizes

```bash
ls -lh burnmark-*.woff2
```

Expected: 15-40KB each. 8 files total (4 regular + 4 bold). ~200KB combined.

## 6. Copy to repo

```bash
DEST=/path/to/designer-core/packages/core/src/fonts/bundled

cp burnmark-*.woff2 "$DEST/"
cp LICENSE-*.txt "$DEST/"
```

Verify filenames match what `packages/core/src/fonts.ts` expects.

## 7. Verify fonts load

```bash
cd /path/to/designer-core
pnpm build
pnpm test
```

The existing font loader tests should pass with the real files in place.
If `fonts.ts` references different filenames, update either the filenames
or the code to match.

## 8. Commit

```bash
git add packages/core/src/fonts/bundled/
git commit -m "feat: add real WOFF2 font subsets (Inter, JetBrains Mono, Bitter, Barlow Condensed)"
git push
```