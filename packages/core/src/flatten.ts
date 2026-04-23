import { type LabelDocument } from './document.js';
import { type PrinterCapabilities } from './types.js';
import { renderPlanes, type RenderOptions } from './render/pipeline.js';
import { type LabelBitmap } from '@mbtech-nl/bitmap';

/**
 * Render a document to printer planes (1bpp bitmaps, one per plane in
 * `capabilities.colors`). Thin wrapper around `renderPlanes` — kept as a
 * stable top-level public function for the common case.
 */
export function flattenForPrinter(
  doc: LabelDocument,
  capabilities: PrinterCapabilities,
  options: RenderOptions = {},
): Promise<Map<string, LabelBitmap>> {
  return renderPlanes(doc, capabilities, options);
}
