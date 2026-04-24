# Template engine

Labels often share a design across many rows of data — orders,
addresses, inventory SKUs, name badges. designer-core's template engine
handles the common case: a single `.label` file with `{{placeholder}}`
tokens in text and barcode fields, substituted at render time from a
plain `Record<string, string>` or a CSV file.

## `{{placeholder}}` syntax

- Tokens are wrapped in double curly braces: `{{name}}`.
- Keys are **case-insensitive**: `{{Name}}`, `{{NAME}}`, and `{{name}}`
  all look up the same variable.
- Whitespace around keys is **trimmed**: `{{ name }}` is equivalent to
  `{{name}}`.
- Missing variables are **left as-is**: an un-substituted `{{name}}`
  renders literally. This is intentional — it makes missing variables
  visible in the output instead of silently producing blank labels.

Tokens are recognised in two places: `TextObject.content` and
`BarcodeObject.data`. They are not expanded in image asset keys, colour
strings, or metadata.

## Helpers

```ts
import {
  applyTemplate,
  applyVariables,
  extractPlaceholders,
  validateVariables,
} from '@burnmark-io/designer-core';
```

### `applyTemplate(template, variables)`

Resolve a single string. Useful when you're generating template
strings dynamically or running ad-hoc substitutions outside the
document.

```ts
applyTemplate('Order #{{id}} — {{name}}', { id: '12345', name: 'Mannes' });
// → 'Order #12345 — Mannes'
```

### `applyVariables(doc, variables)`

Return a **new** document with every `TextObject.content` and
`BarcodeObject.data` resolved. The original document is not mutated;
the rendering pipeline calls this for you when you pass `variables` to
`render()` / `renderToBitmap()` / `renderPlanes()`, so you rarely need
to call it directly unless you want a resolved snapshot for logging or
diffing.

### `extractPlaceholders(doc)`

Return the sorted, deduplicated, lowercased list of every placeholder
the document references.

```ts
extractPlaceholders(designer.document);
// → ['address_line_1', 'city', 'name', 'postcode']
```

Drive your UI from this — for example, a variables panel that shows one
text input per placeholder, or a CSV column-mapping dialog that only
asks about columns that are actually used.

### `validateVariables(doc, variables)`

Check a variable record against the document's placeholders and get
back `{ valid, missing, unused, warnings }`.

```ts
validateVariables(doc, { name: 'Mannes', postcode: '3528 BJ' });
// {
//   valid: false,
//   missing: ['address_line_1', 'city'],
//   unused: [],
//   warnings: ['Missing variables will render as literal {{placeholder}} tokens: address_line_1, city'],
// }
```

Run this before kicking off a CSV batch — you'd rather see a fast fail
than a 10,000-row batch with `{{city}}` stamped on every label.

## Christmas cards walkthrough

A realistic end-to-end example. You have a CSV of names and Dutch
addresses and a Brother QL on 62 mm continuous tape. You want one
address label per row.

### The design

The `.label` file for this walkthrough is committed to the docs so the
snippet is grounded in a real, round-trippable document:
[`christmas-card.label`](/assets/christmas-card.label). The same file
is annotated field-by-field in the [`.label` format reference](/reference/label-format).

In code, the equivalent designer setup:

```ts
import { LabelDesigner } from '@burnmark-io/designer-core';

const designer = new LabelDesigner({
  canvas: { widthDots: 696, heightDots: 0, dpi: 300 },
  name: 'Christmas card address label',
});

designer.add({
  type: 'text',
  x: 24, y: 24, width: 648, height: 60,
  rotation: 0, opacity: 1, locked: false, visible: true,
  color: '#000000',
  content: '{{name}}',
  fontFamily: 'Burnmark Sans',
  fontSize: 44, fontWeight: 'bold', fontStyle: 'normal',
  textAlign: 'left', verticalAlign: 'top',
  letterSpacing: 0, lineHeight: 1.2,
  invert: false, wrap: true, autoHeight: false,
});

designer.add({
  type: 'text',
  x: 24, y: 96, width: 648, height: 44,
  rotation: 0, opacity: 1, locked: false, visible: true,
  color: '#000000',
  content: '{{address_line_1}}',
  fontFamily: 'Burnmark Sans',
  fontSize: 32, fontWeight: 'normal', fontStyle: 'normal',
  textAlign: 'left', verticalAlign: 'top',
  letterSpacing: 0, lineHeight: 1.2,
  invert: false, wrap: true, autoHeight: false,
});

designer.add({
  type: 'text',
  x: 24, y: 148, width: 648, height: 44,
  rotation: 0, opacity: 1, locked: false, visible: true,
  color: '#000000',
  content: '{{postcode}}  {{city}}',
  fontFamily: 'Burnmark Sans',
  fontSize: 32, fontWeight: 'normal', fontStyle: 'normal',
  textAlign: 'left', verticalAlign: 'top',
  letterSpacing: 0, lineHeight: 1.2,
  invert: false, wrap: true, autoHeight: false,
});
```

### The CSV

```csv
name,address_line_1,postcode,city
Mannes Brak,Papendorpseweg 100,3528 BJ,Utrecht
Anna de Vries,Keizersgracht 12,1015 CJ,Amsterdam
Tom Jansen,Coolsingel 42,3011 AD,Rotterdam
```

Column names match the placeholder names exactly (case-insensitively).
If yours don't, rename them before handing them to the batch renderer,
or remap them row-by-row — both are one-liners.

### Validate before printing

```ts
import { parseCsv, validateVariables } from '@burnmark-io/designer-core';
import { readFile } from 'node:fs/promises';

const csv = await parseCsv(await readFile('addresses.csv', 'utf-8'));

const [firstRow] = csv.rows;
const report = validateVariables(designer.document, firstRow ?? {});

if (!report.valid) {
  console.error('CSV is missing columns:', report.missing);
  process.exit(1);
}
```

### Render and print

```ts
import { renderBatch } from '@burnmark-io/designer-core';
import { openPrinter } from 'burnmark-cli/dist/drivers.js'; // or your own driver factory

const printer = await openPrinter('usb://brother-ql');
await printer.connect();

for await (const result of renderBatch(designer, csv.rows)) {
  await printer.print(result.planes);
}

await printer.disconnect();
```

`renderBatch` is an **async generator**. Each iteration renders one row
and yields a `BatchResult` with a `planes: Map<string, LabelBitmap>`
map (single-colour by default — add `TWO_COLOR_BLACK_RED` as the third
argument for two-colour printing). The previous iteration's bitmaps are
eligible for garbage collection as soon as the loop advances, so memory
stays flat even on very large CSVs.

Or, the equivalent from the CLI:

```bash
burnmark validate --template christmas-card.label --csv addresses.csv
burnmark print    --template christmas-card.label --csv addresses.csv --printer usb://brother-ql
```

## CSV parsing — `parseCsv()`

```ts
import { parseCsv, type CsvData } from '@burnmark-io/designer-core';
```

`parseCsv` wraps [Papaparse](https://www.papaparse.com/). Accepts a
string, byte buffer, or `Blob`/`File`, and returns a `CsvData` shape:

```ts
interface CsvData {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}
```

Notable behaviours:

- **Header detection.** Always assumes the first row is headers.
  Headers are trimmed (`"  name "` becomes `"name"`).
- **Empty rows skipped.** Papaparse's `skipEmptyLines: 'greedy'` — a row
  is considered empty if every column is empty or whitespace-only.
- **Quoted fields and escaped quotes** are handled (CSV standard RFC
  4180). `"Name, with comma"` stays as one field; `""Quote""` inside a
  quoted field resolves to `"Quote"`.
- **Mixed-type cells are coerced to strings.** A numeric cell like `42`
  becomes `'42'`. Placeholders only substitute strings, so this is the
  right default.
- **Quote errors throw.** Missing delimiters and ragged rows are
  tolerated (Papaparse fills/trims); unbalanced quotes throw
  `CSV parse error: …` because those usually indicate a corrupted file.
- **Delimiters are auto-detected.** Papaparse inspects the first few
  rows. Semicolon-delimited (`;`) exports from Excel-nl work out of the
  box; so do TSV files.

```ts
const text = 'id,qty\n1,2\n3,4\n';
const csv = await parseCsv(text);
// csv.headers → ['id', 'qty']
// csv.rows    → [{ id: '1', qty: '2' }, { id: '3', qty: '4' }]
```

## `renderBatch()` and memory

```ts
import { renderBatch, TWO_COLOR_BLACK_RED } from '@burnmark-io/designer-core';

async function* progressify<T>(gen: AsyncGenerator<T>, label: string) {
  let i = 0;
  for await (const value of gen) {
    i += 1;
    if (i % 100 === 0) console.log(`${label}: ${i}`);
    yield value;
  }
}

for await (const result of progressify(
  renderBatch(designer, csv.rows, TWO_COLOR_BLACK_RED),
  'Printed',
)) {
  const black = result.planes.get('black');
  const red   = result.planes.get('red');
  // Send to the driver…
}
```

Two pitfalls to avoid:

- **Don't collect into an array.** `Array.fromAsync(renderBatch(...))`
  or a simple `for (const r of await Promise.all(...))` forces every
  label's RGBA buffer + 1bpp bitmap to be kept alive simultaneously.
  On a 10,000-row batch that's several gigabytes.
- **Don't keep references after yielding.** If you push every
  `BatchResult` onto a "for progress tracking" array, same problem.
  Extract `result.index` (or whatever you actually need) and let the
  result go out of scope.

See [Rendering — Batch memory](/guide/rendering#batch-memory) for more.
