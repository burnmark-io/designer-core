import { type LabelDocument } from '../document.js';
import { renderFull, type RenderOptions } from '../render/pipeline.js';
import { exportPng, type PngExportOptions } from './png.js';

/**
 * A single rectangular grid of label positions on a sheet.
 *
 * Most sheets have one layout. A few (staggered business cards, offset
 * product codes) have two — a "normal" grid and an offset grid on the
 * same sheet. Encoding the positions as `origin + pitch` rather than
 * `margin + labelSize + gutter` keeps offset and overlap cases
 * expressible without special-casing.
 */
export interface SheetLayout {
  columns: number; // `nx` — labels per row
  rows: number; // `ny` — label rows
  originXMm: number; // `x0` — left offset of the first label
  originYMm: number; // `y0` — top offset of the first label
  pitchXMm: number; // `dx` — horizontal distance between label origins
  pitchYMm: number; // `dy` — vertical distance between label origins
}

/**
 * Sticker-sheet template — paper size, label size, one or more grid
 * layouts. Structurally compatible with
 * `@burnmark-io/sheet-templates` so objects from that package pass
 * directly to {@link exportSheet} without conversion.
 *
 * Fields marked "UI metadata" are carried through but **not consumed**
 * by {@link exportSheet}. Applications that need round cut guides,
 * non-printing label margins, or category filters draw/filter them
 * themselves.
 */
export interface SheetTemplate {
  code: string;
  name: string;
  /**
   * Paper size name (e.g. `'A4'`, `'Letter'`, `'A3'`, `'Legal'`). Free-form
   * so sheet-templates can carry any name; the exporter uses
   * {@link paperWidthMm} / {@link paperHeightMm} for the actual page.
   */
  paperSize: string;
  paperWidthMm: number;
  paperHeightMm: number;
  labelWidthMm: number;
  labelHeightMm: number;
  /** One or more grid layouts; positions from all layouts are union-sorted. */
  layouts: SheetLayout[];
  /** UI metadata — shape hint for cut guides. Not consumed by `exportSheet`. */
  labelShape?: 'rectangle' | 'round' | 'ellipse';
  /** UI metadata — corner radius for rectangle labels. Not consumed. */
  cornerRadiusMm?: number;
  /** UI metadata — non-printing margin inside each label. Not consumed. */
  marginMm?: number;
}

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
 * Enumerate every label position on one sheet — across all layouts —
 * sorted top-to-bottom then left-to-right. For a single-layout sheet
 * the result is identical to the old row-major iteration.
 */
export function positionsFromSheet(sheet: SheetTemplate): { xMm: number; yMm: number }[] {
  const positions: { xMm: number; yMm: number }[] = [];
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
  positions.sort((a, b) => a.yMm - b.yMm || a.xMm - b.xMm);
  return positions;
}

/**
 * Total label positions on one sheet across every layout.
 */
export function labelsPerPage(sheet: SheetTemplate): number {
  let total = 0;
  for (const layout of sheet.layouts) total += layout.columns * layout.rows;
  return total;
}

/** The first (primary) layout — the common case for single-grid sheets. */
export function primaryLayout(sheet: SheetTemplate): SheetLayout {
  const first = sheet.layouts[0];
  if (!first) throw new Error(`Sheet "${sheet.code}" has no layouts`);
  return first;
}

/** `true` when the sheet has more than one grid (staggered / offset). */
export function isMultiLayout(sheet: SheetTemplate): boolean {
  return sheet.layouts.length > 1;
}

/**
 * Export a sticker-sheet PDF. Tiles the label design across every
 * position produced by {@link positionsFromSheet}. If `rows` is supplied,
 * each row becomes a unique label; otherwise every position is filled
 * with the same label. Extra rows paginate onto new sheets.
 */
export interface SheetExportOptions extends RenderOptions {
  /**
   * Forwarded to the per-label PNG renderer. Defaults to `true` so a
   * horizontal-orientation document tiles as rotated PNGs. Sheet slots
   * are sized in mm by the template, so rotation only affects the
   * embedded image's intrinsic aspect ratio — the on-paper geometry is
   * always determined by the sheet template.
   */
  respectOrientation?: boolean;
}

export async function exportSheet(
  doc: LabelDocument,
  sheet: SheetTemplate,
  rows?: Record<string, string>[],
  options: SheetExportOptions = {},
): Promise<Blob> {
  const { jsPDF } = (await import('jspdf')) as unknown as {
    jsPDF: new (opts: {
      unit: string;
      format: [number, number];
      orientation: 'portrait' | 'landscape';
    }) => JsPdfSheet;
  };

  const pageFormat: [number, number] = [sheet.paperWidthMm, sheet.paperHeightMm];
  const pdf = new jsPDF({ unit: 'mm', format: pageFormat, orientation: 'portrait' });

  const positions = positionsFromSheet(sheet);
  const perPage = positions.length;
  if (perPage === 0) return pdf.output('blob');

  const iterRows: Record<string, string>[] = rows && rows.length > 0 ? rows : [{}];

  // Cache rendered label PNGs per unique variable set — cheap when the
  // same row fills every position on a sheet.
  const cache = new Map<string, string>();

  const total = rows && rows.length > 0 ? rows.length : perPage;
  let pageIndex = 0;
  for (let i = 0; i < total; i++) {
    const row = iterRows[i % iterRows.length] ?? {};
    const dataUrl = await getDataUrl(doc, row, options, cache);

    const positionOnPage = i % perPage;
    if (positionOnPage === 0 && pageIndex > 0) {
      pdf.addPage(pageFormat, 'portrait');
    }
    if (positionOnPage === 0) pageIndex += 1;

    const pos = positions[positionOnPage];
    if (!pos) continue;

    pdf.addImage(dataUrl, 'PNG', pos.xMm, pos.yMm, sheet.labelWidthMm, sheet.labelHeightMm);
  }

  return pdf.output('blob');
}

async function getDataUrl(
  doc: LabelDocument,
  row: Record<string, string>,
  options: SheetExportOptions,
  cache: Map<string, string>,
): Promise<string> {
  const key = JSON.stringify(row);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const pngOpts: PngExportOptions = { ...options, variables: row };
  const blob = await exportPng(doc, pngOpts);
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

/** Alias for {@link labelsPerPage}. */
export function positionsPerSheet(sheet: SheetTemplate): number {
  return labelsPerPage(sheet);
}

/** Total number of sheets needed for a given row count. */
export function sheetsNeeded(sheet: SheetTemplate, rowCount: number): number {
  const per = labelsPerPage(sheet);
  return per > 0 ? Math.ceil(rowCount / per) : 0;
}

// Re-render entry: uses renderFull directly when callers already have an
// RGBA image; not currently used internally but exposed for future work.
export async function _sheetImage(
  doc: LabelDocument,
  options: RenderOptions = {},
): Promise<ReturnType<typeof renderFull>> {
  return renderFull(doc, options);
}
