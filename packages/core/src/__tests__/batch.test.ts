import { describe, expect, it } from 'vitest';
import { LabelDesigner } from '../designer.js';
import { renderBatch } from '../batch.js';
import { type LabelObjectInput, type TextObject } from '../objects.js';

const textInput = (overrides: Partial<TextObject> = {}): LabelObjectInput<TextObject> => ({
  type: 'text',
  x: 0,
  y: 0,
  width: 150,
  height: 30,
  rotation: 0,
  opacity: 1,
  locked: false,
  visible: true,
  color: '#000000',
  content: 'Hello {{name}}',
  fontFamily: 'sans-serif',
  fontSize: 18,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'left',
  verticalAlign: 'top',
  letterSpacing: 0,
  lineHeight: 1.2,
  invert: false,
  wrap: false,
  autoHeight: false,
  ...overrides,
});

describe('renderBatch', () => {
  it('yields one BatchResult per row with an RGBA image', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 50 } });
    d.add(textInput());
    const rows = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
    const results: { index: number; width: number; height: number }[] = [];
    for await (const r of renderBatch(d, rows)) {
      results.push({ index: r.index, width: r.image.width, height: r.image.height });
    }
    expect(results).toEqual([
      { index: 0, width: 200, height: 50 },
      { index: 1, width: 200, height: 50 },
      { index: 2, width: 200, height: 50 },
    ]);
  });

  it('yields nothing for an empty rows array', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 50 } });
    d.add(textInput());
    const it = renderBatch(d, []);
    const first = await it.next();
    expect(first.done).toBe(true);
  });

  it('exposes the source row verbatim', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 50 } });
    d.add(textInput());
    const row = { name: 'Verbatim', extra: 'kept' };
    for await (const r of renderBatch(d, [row])) {
      expect(r.row).toEqual(row);
    }
  });

  it('LabelDesigner.renderBatch delegates to renderBatch', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 50 } });
    d.add(textInput());
    let count = 0;
    for await (const r of d.renderBatch([{ name: 'A' }, { name: 'B' }])) {
      expect(r.image.width).toBe(200);
      count += 1;
    }
    expect(count).toBe(2);
  });
});
