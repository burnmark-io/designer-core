import { describe, expect, it } from 'vitest';
import { LabelDesigner } from '../designer.js';
import {
  exportSheet,
  isMultiLayout,
  labelsPerPage,
  positionsFromSheet,
  primaryLayout,
  type SheetTemplate,
} from '../export/sheet.js';
import { BUILTIN_SHEETS, findSheet } from '../export/sheet-registry.js';
import { type ShapeObject, type LabelObjectInput } from '../objects.js';

const shape = (overrides: Partial<ShapeObject> = {}): LabelObjectInput<ShapeObject> => ({
  type: 'shape',
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  rotation: 0,
  opacity: 1,
  locked: false,
  visible: true,
  color: '#000000',
  shape: 'rectangle',
  fill: true,
  strokeWidth: 0,
  invert: false,
  ...overrides,
});

/**
 * Equivalent of the pre-amendment flat-fields iteration. Used in the
 * parity test to prove `positionsFromSheet` produces identical output
 * for any single-layout sheet.
 */
function oldRowMajorPositions(
  layout: { columns: number; rows: number },
  marginLeftMm: number,
  marginTopMm: number,
  labelWidthMm: number,
  labelHeightMm: number,
  gutterHMm: number,
  gutterVMm: number,
): { xMm: number; yMm: number }[] {
  const out: { xMm: number; yMm: number }[] = [];
  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.columns; col++) {
      out.push({
        xMm: marginLeftMm + col * (labelWidthMm + gutterHMm),
        yMm: marginTopMm + row * (labelHeightMm + gutterVMm),
      });
    }
  }
  return out;
}

describe('positionsFromSheet', () => {
  it('matches the old row-major layout for every single-layout built-in sheet', () => {
    // Reconstruct each built-in sheet's flat-field equivalents from its
    // origin/pitch representation. Pitch = labelSize + gutter, so gutter
    // = pitch - labelSize.
    for (const sheet of BUILTIN_SHEETS) {
      const [layout] = sheet.layouts;
      if (!layout) throw new Error(`sheet ${sheet.code} missing layout`);
      const gutterHMm = layout.pitchXMm - sheet.labelWidthMm;
      const gutterVMm = layout.pitchYMm - sheet.labelHeightMm;
      const expected = oldRowMajorPositions(
        layout,
        layout.originXMm,
        layout.originYMm,
        sheet.labelWidthMm,
        sheet.labelHeightMm,
        gutterHMm,
        gutterVMm,
      );
      const actual = positionsFromSheet(sheet);
      expect(actual).toHaveLength(expected.length);
      for (let i = 0; i < expected.length; i++) {
        const e = expected[i]!;
        const a = actual[i]!;
        expect(a.xMm).toBeCloseTo(e.xMm, 6);
        expect(a.yMm).toBeCloseTo(e.yMm, 6);
      }
    }
  });

  it('interleaves two layouts in top-to-bottom then left-to-right order', () => {
    // Staggered: layout A starts at (10, 10), layout B starts at (30, 20).
    // Pitch keeps them on their own tracks; the union sort should mix them.
    const sheet: SheetTemplate = {
      code: 'stagger-demo',
      name: 'Stagger demo',
      paperSize: 'A4',
      paperWidthMm: 210,
      paperHeightMm: 297,
      labelWidthMm: 20,
      labelHeightMm: 10,
      layouts: [
        { columns: 2, rows: 2, originXMm: 10, originYMm: 10, pitchXMm: 40, pitchYMm: 40 },
        { columns: 2, rows: 2, originXMm: 30, originYMm: 20, pitchXMm: 40, pitchYMm: 40 },
      ],
    };

    const positions = positionsFromSheet(sheet);
    expect(positions).toEqual([
      { xMm: 10, yMm: 10 }, // A (0,0)
      { xMm: 50, yMm: 10 }, // A (0,1)
      { xMm: 30, yMm: 20 }, // B (0,0)
      { xMm: 70, yMm: 20 }, // B (0,1)
      { xMm: 10, yMm: 50 }, // A (1,0)
      { xMm: 50, yMm: 50 }, // A (1,1)
      { xMm: 30, yMm: 60 }, // B (1,0)
      { xMm: 70, yMm: 60 }, // B (1,1)
    ]);
  });

  it('produces the plan-documented 21-position grid for Avery L7160', () => {
    const sheet = findSheet('avery-l7160')!;
    const positions = positionsFromSheet(sheet);
    expect(positions).toHaveLength(21);
    // First row, left column
    expect(positions[0]).toEqual({ xMm: 7.2, yMm: 15.1 });
    // First row, right column (after two pitches)
    expect(positions[2]!.xMm).toBeCloseTo(7.2 + 2 * 66.0, 6);
    expect(positions[2]!.yMm).toBeCloseTo(15.1, 6);
    // Last row, right column
    expect(positions[20]!.xMm).toBeCloseTo(7.2 + 2 * 66.0, 6);
    expect(positions[20]!.yMm).toBeCloseTo(15.1 + 6 * 38.1, 6);
  });
});

describe('layout helpers', () => {
  it('labelsPerPage sums every layout', () => {
    const singleLayoutSheet = findSheet('avery-l7160')!;
    expect(labelsPerPage(singleLayoutSheet)).toBe(21);

    const multiLayoutSheet: SheetTemplate = {
      code: 'm',
      name: 'm',
      paperSize: 'A4',
      paperWidthMm: 210,
      paperHeightMm: 297,
      labelWidthMm: 20,
      labelHeightMm: 10,
      layouts: [
        { columns: 3, rows: 2, originXMm: 0, originYMm: 0, pitchXMm: 30, pitchYMm: 20 },
        { columns: 2, rows: 2, originXMm: 15, originYMm: 10, pitchXMm: 30, pitchYMm: 20 },
      ],
    };
    expect(labelsPerPage(multiLayoutSheet)).toBe(3 * 2 + 2 * 2); // 10
  });

  it('primaryLayout returns the first layout', () => {
    const sheet = findSheet('avery-l7160')!;
    expect(primaryLayout(sheet)).toBe(sheet.layouts[0]);
  });

  it('isMultiLayout is false for single-layout, true for two or more', () => {
    expect(isMultiLayout(findSheet('avery-l7160')!)).toBe(false);
    const multi: SheetTemplate = {
      code: 'm',
      name: 'm',
      paperSize: 'A4',
      paperWidthMm: 210,
      paperHeightMm: 297,
      labelWidthMm: 10,
      labelHeightMm: 10,
      layouts: [
        { columns: 1, rows: 1, originXMm: 0, originYMm: 0, pitchXMm: 10, pitchYMm: 10 },
        { columns: 1, rows: 1, originXMm: 5, originYMm: 5, pitchXMm: 10, pitchYMm: 10 },
      ],
    };
    expect(isMultiLayout(multi)).toBe(true);
  });
});

describe('exportSheet with multi-layout', () => {
  it('paginates when rows exceed positions across all layouts', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 40, heightDots: 20, dpi: 300 } });
    d.add(shape());

    const sheet: SheetTemplate = {
      code: 'tiny',
      name: 'Tiny staggered demo',
      paperSize: 'A4',
      paperWidthMm: 210,
      paperHeightMm: 297,
      labelWidthMm: 20,
      labelHeightMm: 10,
      layouts: [
        { columns: 2, rows: 2, originXMm: 10, originYMm: 10, pitchXMm: 40, pitchYMm: 40 },
        { columns: 2, rows: 2, originXMm: 30, originYMm: 20, pitchXMm: 40, pitchYMm: 40 },
      ],
    };

    const onePage = await exportSheet(d.document, sheet, [{}]);
    // 10 rows across 8 positions per sheet → 2 pages.
    const tenRows = await exportSheet(
      d.document,
      sheet,
      Array.from({ length: 10 }, (_, i) => ({ idx: String(i) })),
    );
    expect(tenRows.size).toBeGreaterThan(onePage.size);
  });
});

describe('SheetTemplate structural compatibility', () => {
  it('accepts an object with extra fields (as if from @burnmark-io/sheet-templates)', () => {
    // Simulate a sheet-templates superset shape. Extra fields are allowed
    // by TypeScript structural typing at call sites; at runtime they're
    // simply ignored by exportSheet / positionsFromSheet.
    const sheetTemplatesShape = {
      code: 'sample-brand-0001',
      name: 'Sample Brand 0001',
      brand: 'SampleBrand', // extra
      part: '0001', // extra
      categories: ['mailing', 'address'], // extra
      paperSize: 'A4',
      paperWidthMm: 210,
      paperHeightMm: 297,
      labelWidthMm: 63.5,
      labelHeightMm: 38.1,
      labelShape: 'rectangle' as const,
      layouts: [
        {
          columns: 3,
          rows: 7,
          originXMm: 7.2,
          originYMm: 15.1,
          pitchXMm: 66.0,
          pitchYMm: 38.1,
        },
      ],
    };

    // Passes to every public API without a cast:
    const positions = positionsFromSheet(sheetTemplatesShape);
    expect(positions).toHaveLength(21);
    expect(labelsPerPage(sheetTemplatesShape)).toBe(21);
    expect(isMultiLayout(sheetTemplatesShape)).toBe(false);
  });
});
