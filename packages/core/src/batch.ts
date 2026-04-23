import { type LabelDesigner } from './designer.js';
import { type PrinterCapabilities } from './types.js';
import { type LabelBitmap } from '@mbtech-nl/bitmap';
import { SINGLE_COLOR } from './render/colour.js';

export interface BatchResult {
  row: Record<string, string>;
  index: number;
  planes: Map<string, LabelBitmap>;
}

/**
 * Render a batch of labels from CSV rows. Memory-efficient: each label is
 * rendered on demand and yielded, so the consumer can print/save/GC it
 * before the next one is produced.
 *
 * If `capabilities` is omitted, defaults to `SINGLE_COLOR` — one `'black'`
 * plane per yielded result.
 */
export async function* renderBatch(
  designer: LabelDesigner,
  rows: Record<string, string>[],
  capabilities: PrinterCapabilities = SINGLE_COLOR,
): AsyncGenerator<BatchResult> {
  for (const [index, row] of rows.entries()) {
    const planes = await designer.renderPlanes(capabilities, row);
    yield { row, index, planes };
  }
}
