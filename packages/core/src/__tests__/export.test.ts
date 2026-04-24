import { describe, expect, it } from 'vitest';
import { LabelDesigner } from '../designer.js';
import { exportPng } from '../export/png.js';
import { exportPdf } from '../export/pdf.js';
import { exportSheet, positionsPerSheet, sheetsNeeded } from '../export/sheet.js';
import { exportBundled } from '../export/bundle.js';
import { BUILTIN_SHEETS, findSheet, listSheets } from '../export/sheet-registry.js';
import { type ImageObject, type LabelObjectInput, type ShapeObject } from '../objects.js';

const shape = (overrides: Partial<ShapeObject> = {}): LabelObjectInput<ShapeObject> => ({
  type: 'shape',
  x: 10,
  y: 10,
  width: 50,
  height: 50,
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

describe('exportPng', () => {
  it('produces a PNG Blob', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 100, heightDots: 100 } });
    d.add(shape());
    const blob = await exportPng(d.document);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('respects scale option', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 50, heightDots: 50 } });
    d.add(shape({ width: 25, height: 25 }));
    const a = await exportPng(d.document, { scale: 1 });
    const b = await exportPng(d.document, { scale: 2 });
    expect(b.size).toBeGreaterThan(a.size);
  });
});

describe('exportPdf', () => {
  it('produces a single-page PDF for no rows', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 100, heightDots: 50, dpi: 300 } });
    d.add(shape());
    const blob = await exportPdf(d.document);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('produces a multi-page PDF from CSV rows', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 100, heightDots: 50, dpi: 300 } });
    d.add(shape());
    const blobSingle = await exportPdf(d.document);
    const blobMulti = await exportPdf(d.document, [{}, {}, {}]);
    expect(blobMulti.size).toBeGreaterThan(blobSingle.size);
  });
});

describe('exportSheet', () => {
  it('tiles one label across all positions', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 100, heightDots: 50, dpi: 300 } });
    d.add(shape());
    const sheet = findSheet('avery-l7160')!;
    const blob = await exportSheet(d.document, sheet);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('uses CSV rows to vary each position', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 100, heightDots: 50, dpi: 300 } });
    d.add(shape());
    const sheet = findSheet('avery-l7160')!;
    const blob = await exportSheet(d.document, sheet, [{ a: '1' }, { a: '2' }, { a: '3' }]);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('positionsPerSheet returns rows * columns', () => {
    expect(positionsPerSheet(BUILTIN_SHEETS[0]!)).toBe(21); // L7160 has 3*7
  });

  it('sheetsNeeded ceils partial sheets', () => {
    const sheet = BUILTIN_SHEETS[0]!;
    expect(sheetsNeeded(sheet, 1)).toBe(1);
    expect(sheetsNeeded(sheet, 21)).toBe(1);
    expect(sheetsNeeded(sheet, 22)).toBe(2);
    expect(sheetsNeeded(sheet, 43)).toBe(3);
  });
});

describe('sheet-registry', () => {
  it('listSheets returns a copy', () => {
    const a = listSheets();
    a.length = 0;
    expect(listSheets().length).toBeGreaterThan(0);
  });

  it('findSheet returns undefined for unknown codes', () => {
    expect(findSheet('does-not-exist')).toBeUndefined();
  });

  it('every built-in sheet has the required fields', () => {
    for (const s of BUILTIN_SHEETS) {
      expect(s.code).toMatch(/^[\da-z-]+$/);
      expect(s.paperSize).toMatch(/^(A4|Letter)$/);
      expect(s.paperWidthMm).toBeGreaterThan(0);
      expect(s.paperHeightMm).toBeGreaterThan(0);
      expect(s.layouts.length).toBeGreaterThan(0);
      for (const layout of s.layouts) {
        expect(layout.columns).toBeGreaterThan(0);
        expect(layout.rows).toBeGreaterThan(0);
        expect(layout.pitchXMm).toBeGreaterThan(0);
        expect(layout.pitchYMm).toBeGreaterThan(0);
      }
    }
  });
});

describe('exportBundled', () => {
  it('bundles label.json + referenced assets into a zip', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 50, heightDots: 50 } });
    // Store a fake image asset
    const assetKey = await d.assetLoader.store(new Uint8Array([1, 2, 3, 4]));
    const imgInput: LabelObjectInput<ImageObject> = {
      type: 'image',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      color: '#000',
      assetKey,
      fit: 'contain',
      threshold: 128,
      dither: false,
      invert: false,
    };
    d.add(imgInput);
    const { blob, missing } = await exportBundled(d.document, d.assetLoader);
    expect(blob).toBeInstanceOf(Blob);
    expect(missing).toEqual([]);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('reports missing assets without failing', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 50, heightDots: 50 } });
    const ghostImg: LabelObjectInput<ImageObject> = {
      type: 'image',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      color: '#000',
      assetKey: 'ghost-key',
      fit: 'contain',
      threshold: 128,
      dither: false,
      invert: false,
    };
    d.add(ghostImg);
    const { missing } = await exportBundled(d.document, d.assetLoader);
    expect(missing).toEqual(['ghost-key']);
  });
});
