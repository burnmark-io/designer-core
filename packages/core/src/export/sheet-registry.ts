import { type SheetTemplate } from './sheet.js';

/**
 * Built-in sticker-sheet templates. A seed set covering the most common
 * Avery and Herma sheets. For a comprehensive registry (hundreds of
 * products), install the optional `@burnmark-io/sheet-templates`
 * package — its `SheetTemplate` shape is structurally compatible with
 * this one, so its entries pass directly to `exportSheet`.
 */
export const BUILTIN_SHEETS: SheetTemplate[] = [
  {
    code: 'avery-l7160',
    name: 'Avery L7160 — 21 per sheet (63.5 × 38.1 mm)',
    paperSize: 'A4',
    paperWidthMm: 210,
    paperHeightMm: 297,
    labelWidthMm: 63.5,
    labelHeightMm: 38.1,
    layouts: [
      {
        columns: 3,
        rows: 7,
        originXMm: 7.2,
        originYMm: 15.1,
        pitchXMm: 66.0, // 63.5 + 2.5
        pitchYMm: 38.1, // 38.1 + 0
      },
    ],
  },
  {
    code: 'avery-l7163',
    name: 'Avery L7163 — 14 per sheet (99.1 × 38.1 mm)',
    paperSize: 'A4',
    paperWidthMm: 210,
    paperHeightMm: 297,
    labelWidthMm: 99.1,
    labelHeightMm: 38.1,
    layouts: [
      {
        columns: 2,
        rows: 7,
        originXMm: 4.65,
        originYMm: 15.1,
        pitchXMm: 101.6, // 99.1 + 2.5
        pitchYMm: 38.1,
      },
    ],
  },
  {
    code: 'avery-l7173',
    name: 'Avery L7173 — 10 per sheet (99.1 × 57 mm)',
    paperSize: 'A4',
    paperWidthMm: 210,
    paperHeightMm: 297,
    labelWidthMm: 99.1,
    labelHeightMm: 57,
    layouts: [
      {
        columns: 2,
        rows: 5,
        originXMm: 4.65,
        originYMm: 13.5,
        pitchXMm: 101.6, // 99.1 + 2.5
        pitchYMm: 57,
      },
    ],
  },
  {
    code: 'herma-4226',
    name: 'Herma 4226 — 21 per sheet (70 × 42.3 mm)',
    paperSize: 'A4',
    paperWidthMm: 210,
    paperHeightMm: 297,
    labelWidthMm: 70,
    labelHeightMm: 42.3,
    layouts: [
      {
        columns: 3,
        rows: 7,
        originXMm: 0,
        originYMm: 0,
        pitchXMm: 70,
        pitchYMm: 42.3,
      },
    ],
  },
  {
    code: 'avery-l7671',
    name: 'Avery L7671 — round labels (33 × 33 mm)',
    paperSize: 'A4',
    paperWidthMm: 210,
    paperHeightMm: 297,
    labelWidthMm: 33,
    labelHeightMm: 33,
    labelShape: 'round',
    layouts: [
      {
        columns: 5,
        rows: 8,
        originXMm: 19,
        originYMm: 13,
        pitchXMm: 38, // 33 + 5
        pitchYMm: 35, // 33 + 2
      },
    ],
  },
  {
    code: 'letter-30up',
    name: 'US Letter — 30 per sheet (2.625 × 1 in, Avery 5160)',
    paperSize: 'Letter',
    paperWidthMm: 215.9,
    paperHeightMm: 279.4,
    labelWidthMm: 66.675,
    labelHeightMm: 25.4,
    layouts: [
      {
        columns: 3,
        rows: 10,
        originXMm: 4.826,
        originYMm: 12.7,
        pitchXMm: 69.85, // 66.675 + 3.175
        pitchYMm: 25.4,
      },
    ],
  },
];

export function findSheet(code: string): SheetTemplate | undefined {
  return BUILTIN_SHEETS.find(s => s.code === code);
}

export function listSheets(): SheetTemplate[] {
  return [...BUILTIN_SHEETS];
}
