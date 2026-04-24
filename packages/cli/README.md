# burnmark-cli

Command-line interface for the burnmark label design engine. Render `.label`
files, drive the full template + CSV batch + multi-colour flattening pipeline,
send bitmaps to supported thermal printers.

## Install

```bash
pnpm add -g burnmark-cli
# or via npx without install
npx burnmark-cli <command>
```

Drivers are optional peer dependencies. Install only the ones you need:

```bash
pnpm add @thermal-label/brother-ql-node
pnpm add @thermal-label/labelwriter-node
pnpm add @thermal-label/labelmanager-node
```

The CLI auto-discovers drivers at runtime.

## Commands

| Command | Description |
|---|---|
| `burnmark render --template <file> --output <file>` | Render to PNG or PDF |
| `burnmark render --template <file> --csv <file> --output labels.pdf` | Batch render CSV to PDF |
| `burnmark render --template <file> --sheet <code> --csv <file> --output sheet.pdf` | Sticker sheet export |
| `burnmark print --template <file> --printer <url>` | Render and send to printer |
| `burnmark print --template <file> --csv <file> --printer <url>` | Batch print |
| `burnmark validate --template <file> --csv <file>` | Check variables and barcode data |
| `burnmark list-printers` | Show installed driver packages |
| `burnmark list-sheets` | Show built-in sheet templates |

## Flags

```
--template <path>          .label file
--csv <path>               CSV for batch mode
--var key=value            Single variable (repeatable)
--printer usb|tcp://<ip>   Transport URL (auto-detects printer family)
--density light|normal|dark
--delay <ms>               Delay between labels in batch (default 500)
--dry-run                  Render only, do not print
--output <path>            Output file (PNG, PDF)
--sheet <code>             Sheet template code for sticker sheet export
--rows <range>             e.g. 1-50 or 1,3,7 for partial batch
```

## Examples

```bash
burnmark render --template badge.label --var name="Piet" --output badge.png
burnmark render --template cards.label --csv addresses.csv --output cards.pdf
burnmark render --template product.label --sheet avery-l7160 --csv sku.csv --output sheet.pdf
burnmark validate --template invoice.label --csv orders.csv
```

## License

MIT © Mannes Brak
