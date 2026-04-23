import { type SheetTemplate } from './sheet.js';

/**
 * Built-in sheet templates. A seed set covering the most common
 * Avery and Herma sheets. The public `@burnmark-io/sheet-templates` package
 * (once published) provides a larger JSON registry conforming to
 * `SheetTemplate`.
 */
export const BUILTIN_SHEETS: SheetTemplate[] = [
  {
    code: 'avery-l7160',
    name: 'Avery L7160 — 21 per sheet (63.5 × 38.1 mm)',
    paperSize: 'A4',
    labelWidthMm: 63.5,
    labelHeightMm: 38.1,
    columns: 3,
    rows: 7,
    marginTopMm: 15.1,
    marginLeftMm: 7.2,
    gutterHMm: 2.5,
    gutterVMm: 0,
  },
  {
    code: 'avery-l7163',
    name: 'Avery L7163 — 14 per sheet (99.1 × 38.1 mm)',
    paperSize: 'A4',
    labelWidthMm: 99.1,
    labelHeightMm: 38.1,
    columns: 2,
    rows: 7,
    marginTopMm: 15.1,
    marginLeftMm: 4.65,
    gutterHMm: 2.5,
    gutterVMm: 0,
  },
  {
    code: 'avery-l7173',
    name: 'Avery L7173 — 10 per sheet (99.1 × 57 mm)',
    paperSize: 'A4',
    labelWidthMm: 99.1,
    labelHeightMm: 57,
    columns: 2,
    rows: 5,
    marginTopMm: 13.5,
    marginLeftMm: 4.65,
    gutterHMm: 2.5,
    gutterVMm: 0,
  },
  {
    code: 'herma-4226',
    name: 'Herma 4226 — 21 per sheet (70 × 42.3 mm)',
    paperSize: 'A4',
    labelWidthMm: 70,
    labelHeightMm: 42.3,
    columns: 3,
    rows: 7,
    marginTopMm: 0,
    marginLeftMm: 0,
    gutterHMm: 0,
    gutterVMm: 0,
  },
  {
    code: 'avery-l7671',
    name: 'Avery L7671 — round labels (33 × 33 mm)',
    paperSize: 'A4',
    labelWidthMm: 33,
    labelHeightMm: 33,
    columns: 5,
    rows: 8,
    marginTopMm: 13,
    marginLeftMm: 19,
    gutterHMm: 5,
    gutterVMm: 2,
  },
  {
    code: 'letter-30up',
    name: 'US Letter — 30 per sheet (2.625 × 1 in, Avery 5160)',
    paperSize: 'Letter',
    labelWidthMm: 66.675,
    labelHeightMm: 25.4,
    columns: 3,
    rows: 10,
    marginTopMm: 12.7,
    marginLeftMm: 4.826,
    gutterHMm: 3.175,
    gutterVMm: 0,
  },
];

export function findSheet(code: string): SheetTemplate | undefined {
  return BUILTIN_SHEETS.find(s => s.code === code);
}

export function listSheets(): SheetTemplate[] {
  return [...BUILTIN_SHEETS];
}
