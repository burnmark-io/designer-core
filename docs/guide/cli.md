# CLI

`burnmark-cli` is a command-line front-end over designer-core. It
renders `.label` files to PNG or PDF, tiles them onto sticker sheets,
validates templates against CSV files, and prints directly to any
connected `@thermal-label/*` driver. It's useful as a standalone tool
and as a scripting primitive in CI pipelines.

## Install

```bash
pnpm add -g burnmark-cli
```

Install any printer drivers you want to use — each is an optional peer
dependency:

```bash
pnpm add -g @thermal-label/brother-ql-node
pnpm add -g @thermal-label/labelmanager-node
pnpm add -g @thermal-label/labelwriter-node
```

You don't need to install a driver to use `render`, `validate`, or the
`list-*` commands — only `print` requires one.

## Driver discovery

At `print` time, the CLI dynamically imports every known driver package
name and collects the ones that succeed. Missing drivers are silently
skipped — that's the reason `list-printers` is called "drivers installed"
in the help text and not "printers connected". Nothing is probed over
USB or TCP until you issue an actual print command with a URL.

URL-scheme hints — `usb://brother-ql`, `tcp://192.168.1.42` — nudge the
CLI to try matching drivers first, so the dispatch is nearly instant
even with multiple drivers installed.

## Commands

### `burnmark render`

Render a `.label` file to PNG or PDF. The output extension determines
the format; passing `--sheet` overrides to a sticker-sheet PDF.

```bash
burnmark render --template my-label.label --output preview.png
burnmark render --template my-label.label --csv orders.csv --output batch.pdf
burnmark render --template my-label.label --sheet avery-l7160 --csv skus.csv --output sheet.pdf
```

Flags:

| Flag                | Required | Notes                                                              |
| ------------------- | -------- | ------------------------------------------------------------------ |
| `--template <path>` | yes      | `.label` JSON file                                                 |
| `--output <path>`   | yes      | `.png` or `.pdf` — extension decides the format                    |
| `--csv <path>`      | no       | CSV file. One page per row (PDF) or one label (PNG, row 1 only)    |
| `--var key=value`   | no       | Static variable; repeatable (`--var name=Piet --var city=Utrecht`) |
| `--sheet <code>`    | no       | Sticker-sheet code (`avery-l7160`, etc.); forces PDF output        |
| `--rows <range>`    | no       | Filter CSV rows: `1-50` or `1,3,7,12`                              |

PNG output is single-label only — `--csv` uses the first row. Use PDF
for batches.

### `burnmark render --sheet`

When `--sheet` is supplied, the output is always a sticker-sheet PDF,
regardless of the output file's extension.

```bash
burnmark render \
  --template address.label \
  --sheet avery-l7160 \
  --csv addresses.csv \
  --output sheet.pdf
```

Without `--csv`, every sheet position is filled with the same label
(useful when you want 21 identical stickers on an Avery L7160 sheet).
With `--csv`, each row gets its own position; additional sheets are
added as needed.

See `burnmark list-sheets` for available codes.

### `burnmark print`

Render + send to a connected printer. Requires a `@thermal-label/*`
driver to be installed.

```bash
burnmark print --template address.label --var name="Piet" --printer usb://brother-ql
burnmark print --template address.label --csv addresses.csv --printer usb://brother-ql
```

Flags:

| Flag                | Required | Notes                                                        |
| ------------------- | -------- | ------------------------------------------------------------ |
| `--template <path>` | yes      | `.label` JSON file                                           |
| `--printer <url>`   | yes      | Transport URL, e.g. `usb://brother-ql`, `tcp://192.168.1.42` |
| `--csv <path>`      | no       | Batch mode — one label per CSV row                           |
| `--var key=value`   | no       | Static variable; repeatable                                  |
| `--rows <range>`    | no       | Filter CSV rows                                              |
| `--density <mode>`  | no       | `light` \| `normal` \| `dark`                                |
| `--delay <ms>`      | no       | Delay between labels in batch. Default `500`                 |
| `--dry-run`         | no       | Render every row; don't open the printer                     |

`--dry-run` is the quickest way to verify a big batch renders
successfully without burning tape. It returns the same `✓ Sent N
label(s)` message but no bytes go to the printer.

### `burnmark print --csv`

Batch-print from a CSV. Order: each CSV row (possibly filtered by
`--rows`) produces one label. A 500 ms delay between labels keeps
Brother QL tape cutters happy — lower to `--delay 0` for printers that
batch internally.

```bash
burnmark print \
  --template christmas-card.label \
  --csv addresses.csv \
  --printer usb://brother-ql \
  --density normal
```

Printing is two-colour aware — the CLI passes `adapter.capabilities`
into `renderBatch`, so a Brother QL800 printing on DK-22251 produces
`black` and `red` planes automatically from your CSS-coloured objects.

### `burnmark validate`

Check that every placeholder in a template is covered by the CSV, and
that every barcode object produces valid output for every row.

```bash
burnmark validate --template my-label.label --csv orders.csv
```

Output:

```
Template: my-label.label
  Placeholders referenced: name, order_id, address_line_1
  CSV rows checked:        54
  Missing variables:       address_line_1
  Unused variables:        notes
  Barcode failures:        2
    row 12 / bc-1: bwip-js: data length 12 not permitted for ean13
    row 47 / bc-1: bwip-js: invalid character in code39 data
✓ Validation passed
```

Exit code: `0` if everything passed, `1` otherwise. Great for CI.

### `burnmark list-printers`

Show **installed driver packages** — what the CLI can dynamically
import from `node_modules`. It does not probe connected hardware.

```bash
$ burnmark list-printers
brother-ql      @thermal-label/brother-ql-node
labelmanager    @thermal-label/labelmanager-node
```

If no drivers are installed, prints a one-line hint:

```bash
$ burnmark list-printers
No printer drivers installed.
```

### `burnmark list-sheets`

Show the built-in sheet templates available to `--sheet`.

```bash
$ burnmark list-sheets
avery-l7160        A4      7×3 — Avery L7160 — 21 per sheet (63.5 × 38.1 mm)
avery-l7163        A4      7×2 — Avery L7163 — 14 per sheet (99.1 × 38.1 mm)
avery-l7173        A4      5×2 — Avery L7173 — 10 per sheet (99.1 × 57 mm)
herma-4226         A4      7×3 — Herma 4226 — 21 per sheet (70 × 42.3 mm)
avery-l7671        A4      8×5 — Avery L7671 — round labels (33 × 33 mm)
letter-30up        Letter  10×3 — US Letter — 30 per sheet (2.625 × 1 in, Avery 5160)
```

## Scripting recipes

### CI — render a preview image on every PR

```yaml
# .github/workflows/label-preview.yml
- run: pnpm add -g burnmark-cli
- run: burnmark render --template templates/shipping.label --output preview.png
- uses: actions/upload-artifact@v4
  with:
    name: label-preview
    path: preview.png
```

### Cron — nightly batch render from a live dataset

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. Fetch yesterday's orders as CSV.
curl -sSL "$ORDERS_API/yesterday.csv" -o /tmp/orders.csv

# 2. Validate first — cheap fail vs a 10k-row batch.
burnmark validate \
  --template /opt/labels/shipping.label \
  --csv /tmp/orders.csv

# 3. Render to a sheet PDF for archival.
burnmark render \
  --template /opt/labels/shipping.label \
  --sheet avery-l7160 \
  --csv /tmp/orders.csv \
  --output "/mnt/archive/shipping-$(date -I).pdf"
```

### `package.json` script — label printing for local dev

```json
{
  "scripts": {
    "print:test": "burnmark print --template fixtures/test.label --var name='Dev User' --printer usb://brother-ql --dry-run"
  }
}
```

### Pipe a CSV through the validator

```bash
cat addresses.csv | tee >(
  burnmark validate \
    --template address.label \
    --csv /dev/stdin
) > /dev/null
```

Validator exits non-zero if any row is missing a placeholder, which
fails the pipeline.
