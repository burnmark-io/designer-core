import { type LabelDesigner } from './designer.js';
import { type RawImageData } from './types.js';

export interface BatchResult {
  row: Record<string, string>;
  index: number;
  image: RawImageData;
}

/**
 * Render a batch of labels from CSV rows. Memory-efficient: each label is
 * rendered on demand and yielded, so the consumer can print/save/GC it
 * before the next one is produced.
 *
 * Yields full-colour RGBA per row. Colour separation and 1bpp conversion
 * happen downstream in the driver (`printer.print(image, media)`).
 */
export async function* renderBatch(
  designer: LabelDesigner,
  rows: Record<string, string>[],
): AsyncGenerator<BatchResult> {
  for (const [index, row] of rows.entries()) {
    const image = await designer.render(row);
    yield { row, index, image };
  }
}
