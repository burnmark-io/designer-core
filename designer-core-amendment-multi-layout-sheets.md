# designer-core — Amendment: Multi-Layout Sheet Export

> Update `exportSheet` in designer-core to support sticker sheets with
> multiple grid layouts (staggered business cards, offset grids, etc.).
>
> The `@burnmark-io/sheet-templates` package ships `SheetTemplate` with a
> `layouts: SheetLayout[]` array. Designer-core's current `exportSheet`
> implementation uses flat `columns/rows/marginTop/marginLeft/gutterH/gutterV`
> fields from the inline `BUILTIN_SHEETS`. This amendment aligns the two.

---

## 1. The Problem

Some sticker sheets don't have a simple rectangular grid. A typical example
is a staggered business card sheet where odd rows are offset horizontally
from even rows. In glabels XML, this is expressed as two `<Layout>` elements
on the same template — one for the "normal" positions and one for the offset
positions.

The current `SheetTemplate` type in designer-core has flat fields:

```typescript
// Current — can only represent a single grid
export interface SheetTemplate {
  columns: number;
  rows: number;
  marginTopMm: number;
  marginLeftMm: number;
  gutterHMm: number;
  gutterVMm: number;
  // ...
}
```

The sheet-templates package produces:

```typescript
// What @burnmark-io/sheet-templates ships
export interface SheetTemplate {
  layouts: SheetLayout[];
  // ...
}

export interface SheetLayout {
  columns: number;
  rows: number;
  originXMm: number;
  originYMm: number;
  pitchXMm: number;
  pitchYMm: number;
}
```

These need to match.

---

## 2. Type Changes in designer-core

### 2.1 Update `SheetTemplate`

```typescript
// Before
export interface SheetTemplate {
  code: string;
  name: string;
  paperSize: 'A4' | 'Letter';
  paperWidthMm: number;
  paperHeightMm: number;
  labelWidthMm: number;
  labelHeightMm: number;
  columns: number;
  rows: number;
  marginTopMm: number;
  marginLeftMm: number;
  gutterHMm: number;
  gutterVMm: number;
}

// After
export interface SheetTemplate {
  code: string;
  name: string;
  paperSize: string;          // 'A4', 'Letter', or custom
  paperWidthMm: number;
  paperHeightMm: number;
  labelWidthMm: number;
  labelHeightMm: number;
  labelShape?: 'rectangle' | 'round' | 'ellipse';
  cornerRadiusMm?: number;
  layouts: SheetLayout[];     // one or more grid layouts
  marginMm?: number;          // non-printing margin within each label
  categories?: string[];
}

export interface SheetLayout {
  columns: number;            // nx — labels per row in this layout
  rows: number;               // ny — label rows in this layout
  originXMm: number;          // x0 — left offset of first label
  originYMm: number;          // y0 — top offset of first label
  pitchXMm: number;           // dx — horizontal distance between label origins
  pitchYMm: number;           // dy — vertical distance between label origins
}
```

### 2.2 Update `BUILTIN_SHEETS`

Convert the inline templates to use `layouts[]`:

```typescript
// Before
export const BUILTIN_SHEETS = {
  'avery-l7160': {
    code: 'avery-l7160',
    name: 'Avery L7160',
    paperSize: 'A4',
    paperWidthMm: 210,
    paperHeightMm: 297,
    labelWidthMm: 63.5,
    labelHeightMm: 38.1,
    columns: 3,
    rows: 7,
    marginTopMm: 15.1,
    marginLeftMm: 7.2,
    gutterHMm: 2.5,
    gutterVMm: 0,
  },
};

// After
export const BUILTIN_SHEETS = {
  'avery-l7160': {
    code: 'avery-l7160',
    name: 'Avery L7160',
    paperSize: 'A4',
    paperWidthMm: 210,
    paperHeightMm: 297,
    labelWidthMm: 63.5,
    labelHeightMm: 38.1,
    layouts: [{
      columns: 3,
      rows: 7,
      originXMm: 7.2,
      originYMm: 15.1,
      pitchXMm: 66.0,    // 63.5 + 2.5 gutter
      pitchYMm: 38.1,    // 38.1 + 0 gutter
    }],
  },
};
```

---

## 3. Update `exportSheet`

### 3.1 Current Behaviour

The current implementation calculates label positions from flat fields:

```typescript
for (let row = 0; row < sheet.rows; row++) {
  for (let col = 0; col < sheet.columns; col++) {
    const x = sheet.marginLeftMm + col * (sheet.labelWidthMm + sheet.gutterHMm);
    const y = sheet.marginTopMm + row * (sheet.labelHeightMm + sheet.gutterVMm);
    positions.push({ x, y });
  }
}
```

### 3.2 Updated Behaviour

Walk all layouts and collect positions from each:

```typescript
export function positionsFromSheet(sheet: SheetTemplate): Array<{ xMm: number; yMm: number }> {
  const positions: Array<{ xMm: number; yMm: number }> = [];

  for (const layout of sheet.layouts) {
    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.columns; col++) {
        positions.push({
          xMm: layout.originXMm + col * layout.pitchXMm,
          yMm: layout.originYMm + row * layout.pitchYMm,
        });
      }
    }
  }

  // Sort top-to-bottom, left-to-right for natural fill order
  positions.sort((a, b) => a.yMm - b.yMm || a.xMm - b.xMm);

  return positions;
}
```

For a single-layout sheet this produces the same positions as before.
For a staggered two-layout sheet the positions interleave correctly —
sorting by Y then X ensures labels fill top-to-bottom regardless of
which layout they came from.

### 3.3 PDF Rendering

`exportSheet` uses the positions to place rendered label images on
`jsPDF` pages:

```typescript
export async function exportSheet(
  doc: LabelDocument,
  sheet: SheetTemplate,
  rows?: Record<string, string>[],
  options?: ExportOptions,
): Promise<Blob> {
  const positions = positionsFromSheet(sheet);
  const labelsPerPage = positions.length;

  // If rows provided, fill positions with one label per CSV row
  // Auto-paginate: when positions exhausted, add new page
  const totalLabels = rows ? rows.length : labelsPerPage;
  const totalPages = Math.ceil(totalLabels / labelsPerPage);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [sheet.paperWidthMm, sheet.paperHeightMm],
  });

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();

    for (let i = 0; i < labelsPerPage; i++) {
      const labelIndex = page * labelsPerPage + i;
      if (labelIndex >= totalLabels) break;

      const pos = positions[i];
      const variables = rows?.[labelIndex];
      const imageData = await renderLabel(doc, variables);

      pdf.addImage(
        imageData,
        'PNG',
        pos.xMm,
        pos.yMm,
        sheet.labelWidthMm,
        sheet.labelHeightMm,
      );
    }
  }

  return pdf.output('blob');
}
```

### 3.4 Convenience Helpers

For consumers that only need simple single-layout access:

```typescript
/** Get the primary (first) layout — the common case. */
export function primaryLayout(sheet: SheetTemplate): SheetLayout {
  return sheet.layouts[0];
}

/** Total label positions across all layouts on one page. */
export function labelsPerPage(sheet: SheetTemplate): number {
  return sheet.layouts.reduce((sum, l) => sum + l.columns * l.rows, 0);
}

/** Check if a sheet has staggered/offset layouts. */
export function isMultiLayout(sheet: SheetTemplate): boolean {
  return sheet.layouts.length > 1;
}
```

---

## 4. Relationship: Built-in Sheets vs Sheet-Templates Package

### 4.1 Architecture

```
@burnmark-io/designer-core
  BUILTIN_SHEETS — 5-10 most common sheets (Avery L7160, L7163, Herma 4226, etc.)
  Always available, zero extra deps, enough for quick PDF exports

@burnmark-io/sheet-templates        (optional install)
  SHEETS — hundreds of sheets from glabels-qt
  Comprehensive coverage of Avery, Herma, Zweckform, and dozens more brands
```

designer-core works without sheet-templates. Sheet-templates enhances it
but doesn't replace it. Same pattern as `@napi-rs/canvas` being optional —
core works without it, but the experience is better with it.

`exportSheet()` accepts any `SheetTemplate` object — it doesn't care where
it came from. Built-in, from the sheet-templates package, or a custom object
the consumer constructed themselves.

### 4.2 BUILTIN_SHEETS Stays

The built-in set is NOT removed when sheet-templates ships. It exists for
the developer who imports designer-core standalone and wants a quick PDF
export without installing another package. Keep it small — 5-10 common
sheets that cover the most frequently used Avery and Herma product codes.

### 4.3 Merging in the App and CLI

The label-maker app and burnmark-cli install both and present a unified list:

```typescript
import { BUILTIN_SHEETS } from '@burnmark-io/designer-core';
import { SHEETS, listBrands } from '@burnmark-io/sheet-templates';

// sheet-templates is the comprehensive source — use it as primary
// Built-ins are fallback for any sheets not in the full registry
const allSheets = [...SHEETS];
for (const builtin of Object.values(BUILTIN_SHEETS)) {
  if (!allSheets.some(s => s.code === builtin.code)) {
    allSheets.push(builtin);
  }
}
```

In practice, the built-in sheets are all included in the full registry
already. The merge is a safety net, not a feature.

### 4.4 Structural Typing — No Shared Dependency

Both packages define compatible `SheetTemplate` types independently.
Sheet-templates has extra fields (`brand`, `part`, `categories`) that
designer-core doesn't need. TypeScript structural typing makes this work
— a sheet-templates `SheetTemplate` passes cleanly to designer-core's
`exportSheet()` without either package importing from the other.

```typescript
// designer-core's type — the minimum shape
export interface SheetTemplate {
  code: string;
  name: string;
  paperSize: string;
  paperWidthMm: number;
  paperHeightMm: number;
  labelWidthMm: number;
  labelHeightMm: number;
  layouts: SheetLayout[];
  // ...
}

// sheet-templates' type — a superset with extra fields
// Structurally compatible — passes to exportSheet() without casting
export interface SheetTemplate {
  code: string;
  name: string;
  brand: string;           // extra
  part: string;            // extra
  categories?: string[];   // extra
  paperSize: string;
  paperWidthMm: number;
  paperHeightMm: number;
  labelWidthMm: number;
  labelHeightMm: number;
  layouts: SheetLayout[];
  // ...
}
```

No circular dependency, no shared type package needed.

---

## 5. Documentation Requirements

### 5.1 In designer-core docs (`guide/export.md`)

Add a section after the sheet export walkthrough:

```markdown
## More Sheet Templates

designer-core includes a small set of built-in sheets for common label
products (Avery L7160, L7163, Herma 4226, and a few others). For
comprehensive coverage of hundreds of products across dozens of brands,
install the optional sheet-templates package:

\`\`\`bash
pnpm add @burnmark-io/sheet-templates
\`\`\`

\`\`\`typescript
import { findSheet, listBrands } from '@burnmark-io/sheet-templates';

// Find a specific product
const sheet = findSheet('avery-l7160');
await exportSheet(doc, sheet);

// Browse by brand
const averySheets = findByBrand('Avery');

// Search by label dimensions
const matchingSheets = findBySize(63.5, 38.1);

// See all available brands
const brands = listBrands();
// → ['APLI', 'Agipa', 'Avery', 'Herma', 'Zweckform', ...]
\`\`\`

The sheet-templates package includes over 500 templates sourced from the
[glabels-qt](https://github.com/j-evins/glabels-qt) template database
(MIT-licensed). If your label product isn't included,
[open an issue](https://github.com/burnmark-io/sheet-templates/issues)
or pass a custom `SheetTemplate` object to `exportSheet()`.
```

### 5.2 In designer-core docs (`reference/faq.md`)

Add an entry:

```markdown
### "My label sheet product code isn't available"

designer-core includes a small built-in set of common sheets. For
comprehensive coverage, install `@burnmark-io/sheet-templates`:

\`\`\`bash
pnpm add @burnmark-io/sheet-templates
\`\`\`

If your product still isn't listed, you can create a custom SheetTemplate:

\`\`\`typescript
const mySheet: SheetTemplate = {
  code: 'custom-sheet',
  name: 'My Custom Sheet',
  paperSize: 'A4',
  paperWidthMm: 210,
  paperHeightMm: 297,
  labelWidthMm: 63.5,
  labelHeightMm: 38.1,
  layouts: [{
    columns: 3,
    rows: 7,
    originXMm: 7.2,
    originYMm: 15.1,
    pitchXMm: 66.0,
    pitchYMm: 38.1,
  }],
};

await exportSheet(doc, mySheet);
\`\`\`

You can also [open an issue](https://github.com/burnmark-io/sheet-templates/issues)
to request your product be added to the registry.
```

### 5.3 In burnmark-cli help output

```
burnmark list-sheets              list available sheet templates

  Shows built-in sheets by default. Install @burnmark-io/sheet-templates
  for hundreds of additional templates:

    pnpm add @burnmark-io/sheet-templates
```

---

## 6. Tests

```
□ positionsFromSheet with single layout — matches expected positions
□ positionsFromSheet with two layouts — positions interleaved correctly
□ positionsFromSheet sorting — top-to-bottom, left-to-right order
□ labelsPerPage with single layout — columns × rows
□ labelsPerPage with two layouts — sum of both
□ isMultiLayout returns false for single layout
□ isMultiLayout returns true for two layouts
□ exportSheet with single layout — PDF has correct label count
□ exportSheet with multi-layout — PDF positions match both grids
□ exportSheet with CSV rows — auto-paginates correctly
□ exportSheet with more rows than positions — creates multiple pages
□ BUILTIN_SHEETS all have valid layouts[] arrays
□ primaryLayout returns layouts[0]
□ Structural compatibility: sheet-templates SheetTemplate passes to exportSheet
```

---

## 7. Migration

The `BUILTIN_SHEETS` change is the only breaking part — if any code
references `sheet.columns` directly instead of `sheet.layouts[0].columns`,
it breaks. At 0.x with no external consumers this is fine — just update
and bump.

The `exportSheet` function signature doesn't change — it still accepts
`SheetTemplate`. The type just gained a `layouts[]` field and lost the
flat grid fields. Internal usage within designer-core and burnmark-cli
needs updating.

---

## 8. Implementation Checklist

```
□ Update SheetTemplate type — add SheetLayout, replace flat fields with layouts[]
□ Add SheetLayout type
□ Update BUILTIN_SHEETS to use layouts[] (keep the set small — 5-10 common sheets)
□ Add positionsFromSheet() function
□ Add primaryLayout(), labelsPerPage(), isMultiLayout() helpers
□ Update exportSheet to use positionsFromSheet()
□ Update any internal references to sheet.columns/rows/marginTop/etc
□ Update burnmark-cli sheet-related code
□ Update burnmark-cli list-sheets to note optional sheet-templates package
□ All tests
□ Update guide/export.md — add "More Sheet Templates" section
□ Update reference/faq.md — add "My label sheet product code isn't available"
□ typecheck + lint + test + build
□ Commit + push
```

This is a small, focused change. The main risk is missing a reference
to the old flat fields somewhere in the codebase — a global search for
`sheet.columns`, `sheet.rows`, `sheet.marginTopMm`, `sheet.marginLeftMm`,
`sheet.gutterHMm`, `sheet.gutterVMm` will find them all.
