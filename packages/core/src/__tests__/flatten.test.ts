import { describe, expect, it } from 'vitest';
import { flattenForPrinter } from '../flatten.js';
import { createDocument } from '../document.js';
import { SINGLE_COLOR, TWO_COLOR_BLACK_RED } from '../render/colour.js';
import { type LabelObject } from '../objects.js';

const shape = (id: string, color: string): LabelObject => ({
  id,
  type: 'shape',
  x: 10,
  y: 10,
  width: 30,
  height: 30,
  rotation: 0,
  opacity: 1,
  locked: false,
  visible: true,
  color,
  shape: 'rectangle',
  fill: true,
  strokeWidth: 0,
  invert: false,
});

describe('flattenForPrinter', () => {
  it('produces one plane for single-colour capabilities', async () => {
    const doc = createDocument('fp', { widthDots: 100, heightDots: 50 });
    doc.objects.push(shape('a', '#000000'));
    const planes = await flattenForPrinter(doc, SINGLE_COLOR);
    expect([...planes.keys()]).toEqual(['black']);
  });

  it('produces two planes for two-colour capabilities', async () => {
    const doc = createDocument('fp', { widthDots: 100, heightDots: 50 });
    doc.objects.push(shape('a', '#000000'));
    doc.objects.push(shape('b', '#ff0000'));
    const planes = await flattenForPrinter(doc, TWO_COLOR_BLACK_RED);
    expect(new Set(planes.keys())).toEqual(new Set(['black', 'red']));
  });
});
