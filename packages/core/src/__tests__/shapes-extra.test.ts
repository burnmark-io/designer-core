import { describe, expect, it } from 'vitest';
import { LabelDesigner } from '../designer.js';
import { type LabelObjectInput, type ShapeObject } from '../objects.js';

const shape = (overrides: Partial<ShapeObject> = {}): LabelObjectInput<ShapeObject> => ({
  type: 'shape',
  x: 5,
  y: 5,
  width: 60,
  height: 40,
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

describe('shape rendering — variants', () => {
  it('renders ellipse fill', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 100, heightDots: 60 } });
    d.add(shape({ shape: 'ellipse' }));
    const img = await d.render();
    expect(img.width).toBe(100);
  });

  it('renders ellipse stroke', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 100, heightDots: 60 } });
    d.add(shape({ shape: 'ellipse', fill: false, strokeWidth: 2 }));
    const img = await d.render();
    expect(img.width).toBe(100);
  });

  it('renders rectangle with corner radius', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 100, heightDots: 60 } });
    d.add(shape({ cornerRadius: 8 }));
    const img = await d.render();
    expect(img.width).toBe(100);
  });

  it('renders rectangle stroke', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 100, heightDots: 60 } });
    d.add(shape({ fill: false, strokeWidth: 3 }));
    const img = await d.render();
    expect(img.width).toBe(100);
  });

  it('renders each line direction', async () => {
    for (const direction of ['horizontal', 'vertical', 'diagonal-ltr', 'diagonal-rtl'] as const) {
      const d = new LabelDesigner({ canvas: { widthDots: 100, heightDots: 60 } });
      d.add(shape({ shape: 'line', fill: false, strokeWidth: 2, lineDirection: direction }));
      const img = await d.render();
      expect(img.width).toBe(100);
    }
  });

  it('renders inverted shape', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 100, heightDots: 60 } });
    d.add(shape({ invert: true }));
    const img = await d.render();
    expect(img.width).toBe(100);
  });

  it('skips invisible shapes', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 100, heightDots: 60 } });
    d.add(shape({ visible: false }));
    const img = await d.render();
    expect(img.width).toBe(100);
  });
});
