import { type LabelDocument } from '../document.js';
import { renderFull, type RenderOptions } from '../render/pipeline.js';
import { exportPng } from './png.js';

/**
 * Export a full-colour PDF. One page per document (or per CSV row if
 * `rows` is provided). Pages are sized to match the rendered image at
 * the document's DPI.
 */
export async function exportPdf(
  doc: LabelDocument,
  rows?: Record<string, string>[],
  options: RenderOptions = {},
): Promise<Blob> {
  const { jsPDF } = (await import('jspdf')) as unknown as {
    jsPDF: new (opts: {
      unit: string;
      format: [number, number];
      orientation: 'portrait' | 'landscape';
    }) => JsPdf;
  };

  const iterRows: Record<string, string>[] = rows && rows.length > 0 ? rows : [{}];

  // Render the first page to determine the PDF page size (in points).
  const first = await renderOne(doc, iterRows[0] ?? {}, options);
  const widthPt = pxToPt(first.width, doc.canvas.dpi);
  const heightPt = pxToPt(first.height, doc.canvas.dpi);

  const pdf = new jsPDF({
    unit: 'pt',
    format: [widthPt, heightPt],
    orientation: widthPt > heightPt ? 'landscape' : 'portrait',
  });

  pdf.addImage(first.dataUrl, 'PNG', 0, 0, widthPt, heightPt);

  for (const row of iterRows.slice(1)) {
    const r = await renderOne(doc, row, options);
    const w = pxToPt(r.width, doc.canvas.dpi);
    const h = pxToPt(r.height, doc.canvas.dpi);
    pdf.addPage([w, h], w > h ? 'landscape' : 'portrait');
    pdf.addImage(r.dataUrl, 'PNG', 0, 0, w, h);
  }

  return pdf.output('blob');
}

interface JsPdf {
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

async function renderOne(
  doc: LabelDocument,
  variables: Record<string, string>,
  options: RenderOptions,
): Promise<{ width: number; height: number; dataUrl: string }> {
  const image = await renderFull(doc, { ...options, variables });
  const blob = await exportPng(doc, { ...options, variables });
  const dataUrl = await blobToDataUrl(blob);
  return { width: image.width, height: image.height, dataUrl };
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const base64 = bytesToBase64(bytes);
  return `data:${blob.type || 'image/png'};base64,${base64}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  // Node 18+ has Buffer; browsers have btoa + binary string.
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function pxToPt(pixels: number, dpi: number): number {
  return (pixels / dpi) * 72;
}
