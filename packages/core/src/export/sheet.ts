import { type LabelDocument } from '../document.js';
import { renderFull, type RenderOptions } from '../render/pipeline.js';
import { exportPng } from './png.js';

export interface SheetTemplate {
  code: string;
  name: string;
  paperSize: 'A4' | 'Letter';
  labelWidthMm: number;
  labelHeightMm: number;
  columns: number;
  rows: number;
  marginTopMm: number;
  marginLeftMm: number;
  gutterHMm: number;
  gutterVMm: number;
}

const PAPER_SIZES_MM: Record<SheetTemplate['paperSize'], { widthMm: number; heightMm: number }> = {
  A4: { widthMm: 210, heightMm: 297 },
  Letter: { widthMm: 215.9, heightMm: 279.4 },
};

const MM_PER_INCH = 25.4;

interface JsPdfSheet {
  addPage: (format: [number, number], orientation: 'portrait' | 'landscape') => void;
  addImage: (
    data: string,
    format: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => void;
  output: (type: 'blob') => Blob;
}

/**
 * Export a sticker sheet PDF. Tiles the label design across the
 * `SheetTemplate`. If `rows` is supplied, each row is rendered as a unique
 * label on consecutive sheet positions, creating additional sheets as
 * needed. Otherwise every position is filled with the same label.
 */
export async function exportSheet(
  doc: LabelDocument,
  sheet: SheetTemplate,
  rows?: Record<string, string>[],
  options: RenderOptions = {},
): Promise<Blob> {
  const { jsPDF } = (await import('jspdf')) as unknown as {
    jsPDF: new (opts: {
      unit: string;
      format: SheetTemplate['paperSize'];
      orientation: 'portrait' | 'landscape';
    }) => JsPdfSheet;
  };

  const pdf = new jsPDF({ unit: 'mm', format: sheet.paperSize, orientation: 'portrait' });
  const positions = sheet.columns * sheet.rows;

  const iterRows: Record<string, string>[] = rows && rows.length > 0 ? rows : [{}];

  // Cache rendered images per unique variable set so we don't re-render
  // when the same row is used to fill all positions.
  const cache = new Map<string, string>();

  let pageIndex = 0;
  for (let i = 0; i < (rows && rows.length > 0 ? rows.length : positions); i++) {
    const row = iterRows[i % iterRows.length] ?? {};
    const dataUrl = await getDataUrl(doc, row, options, cache);

    const positionOnPage = i % positions;
    if (positionOnPage === 0 && pageIndex > 0) {
      pdf.addPage(
        [PAPER_SIZES_MM[sheet.paperSize].widthMm, PAPER_SIZES_MM[sheet.paperSize].heightMm],
        'portrait',
      );
    }
    if (positionOnPage === 0) pageIndex += 1;

    const col = positionOnPage % sheet.columns;
    const rowIdx = Math.floor(positionOnPage / sheet.columns);

    const x = sheet.marginLeftMm + col * (sheet.labelWidthMm + sheet.gutterHMm);
    const y = sheet.marginTopMm + rowIdx * (sheet.labelHeightMm + sheet.gutterVMm);

    pdf.addImage(dataUrl, 'PNG', x, y, sheet.labelWidthMm, sheet.labelHeightMm);
  }

  return pdf.output('blob');
}

async function getDataUrl(
  doc: LabelDocument,
  row: Record<string, string>,
  options: RenderOptions,
  cache: Map<string, string>,
): Promise<string> {
  const key = JSON.stringify(row);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const blob = await exportPng(doc, { ...options, variables: row });
  const dataUrl = await blobToDataUrl(blob);
  cache.set(key, dataUrl);
  return dataUrl;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const base64 =
    typeof Buffer !== 'undefined' ? Buffer.from(bytes).toString('base64') : btoaFallback(bytes);
  return `data:${blob.type || 'image/png'};base64,${base64}`;
}

function btoaFallback(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** How many labels fit on a single sheet. */
export function positionsPerSheet(sheet: SheetTemplate): number {
  return sheet.rows * sheet.columns;
}

/** Total number of sheets needed for a given row count. */
export function sheetsNeeded(sheet: SheetTemplate, rowCount: number): number {
  const per = positionsPerSheet(sheet);
  return per > 0 ? Math.ceil(rowCount / per) : 0;
}

export { MM_PER_INCH };

// Re-render entry: uses renderFull directly when callers already have an
// RGBA image; not currently used internally but exposed for future work.
export async function _sheetImage(
  doc: LabelDocument,
  options: RenderOptions = {},
): Promise<ReturnType<typeof renderFull>> {
  return renderFull(doc, options);
}
