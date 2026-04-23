import { describe, expect, it } from 'vitest';
import { LabelDesigner } from '../designer.js';
import {
  type ImageObject,
  type LabelObjectInput,
  type ShapeObject,
  type TextObject,
} from '../objects.js';
import { SINGLE_COLOR, TWO_COLOR_BLACK_RED } from '../render/colour.js';
import { fitImage } from '../render/image.js';

const shapeInput = (overrides: Partial<ShapeObject> = {}): LabelObjectInput<ShapeObject> => ({
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

const textInput = (overrides: Partial<TextObject> = {}): LabelObjectInput<TextObject> => ({
  type: 'text',
  x: 0,
  y: 0,
  width: 200,
  height: 40,
  rotation: 0,
  opacity: 1,
  locked: false,
  visible: true,
  color: '#000000',
  content: 'Hello',
  fontFamily: 'sans-serif',
  fontSize: 20,
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

describe('render — full RGBA', () => {
  it('renders an empty document at the canvas dimensions', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 100 } });
    const image = await d.render();
    expect(image.width).toBe(200);
    expect(image.height).toBe(100);
  });

  it('renders a black rectangle object', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 100, heightDots: 100 } });
    d.add(shapeInput());
    const image = await d.render();
    // The rectangle is at (10,10) with width/height 50. Sample a pixel inside it.
    const i = (30 * image.width + 30) * 4;
    expect(image.data[i]).toBe(0);
    expect(image.data[i + 1]).toBe(0);
    expect(image.data[i + 2]).toBe(0);
  });

  it('renders text without throwing', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 100 } });
    d.add(textInput());
    const image = await d.render();
    expect(image.width).toBe(200);
  });
});

describe('renderToBitmap', () => {
  it('produces a 1bpp bitmap at the canvas dimensions', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 100 } });
    d.add(shapeInput());
    const bm = await d.renderToBitmap();
    expect(bm.widthPx).toBe(200);
    expect(bm.heightPx).toBe(100);
    expect(bm.data.length).toBeGreaterThan(0);
    // A solid black rectangle should produce some non-zero bytes.
    expect([...bm.data].some(b => b !== 0)).toBe(true);
  });

  it('handles variable substitution in barcode/text data', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 100 } });
    d.add(textInput({ content: 'Name: {{name}}' }));
    const bm = await d.renderToBitmap({ name: 'Mannes' });
    expect(bm.widthPx).toBe(200);
  });
});

describe('renderPlanes — multi-colour', () => {
  it('single-colour capability → one plane', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 100, heightDots: 100 } });
    d.add(shapeInput({ color: '#000000' }));
    d.add(shapeInput({ color: '#ff0000' }));
    const planes = await d.renderPlanes(SINGLE_COLOR);
    expect(planes.size).toBe(1);
    expect(planes.get('black')).toBeDefined();
  });

  it('two-colour capability → two planes with object partitioning', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 100, heightDots: 100 } });
    d.add(shapeInput({ color: '#000000', x: 10, y: 10 }));
    d.add(shapeInput({ color: '#ff0000', x: 50, y: 10 }));
    const planes = await d.renderPlanes(TWO_COLOR_BLACK_RED);
    expect(planes.size).toBe(2);
    const black = planes.get('black')!;
    const red = planes.get('red')!;
    expect(black.widthPx).toBe(100);
    expect(red.widthPx).toBe(100);
    // Each plane has some content.
    expect([...black.data].some(b => b !== 0)).toBe(true);
    expect([...red.data].some(b => b !== 0)).toBe(true);
  });
});

describe('continuous labels', () => {
  it('auto-crops height for heightDots === 0', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 0 } });
    d.add(shapeInput({ x: 0, y: 0, width: 100, height: 30 }));
    const image = await d.render();
    // Not the initial 10_000 scratch height
    expect(image.height).toBeLessThan(100);
    expect(image.height).toBeGreaterThan(0);
  });
});

describe('opacity warning', () => {
  it('emits an error event when opacity < 1 on a text object', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 100 } });
    let warnings = 0;
    d.on('error', () => {
      warnings += 1;
    });
    d.add(textInput({ opacity: 0.5, content: 'faded' }));
    await d.renderToBitmap();
    expect(warnings).toBeGreaterThan(0);
  });

  it('does not warn for opacity === 1', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 100 } });
    let warnings = 0;
    d.on('error', () => {
      warnings += 1;
    });
    d.add(textInput());
    await d.renderToBitmap();
    expect(warnings).toBe(0);
  });
});

describe('fitImage', () => {
  const image = (overrides: Partial<ImageObject> = {}): ImageObject => ({
    id: 'img',
    type: 'image',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    color: '#000',
    assetKey: 'x',
    fit: 'contain',
    threshold: 128,
    dither: false,
    invert: false,
    ...overrides,
  });

  it('fill stretches to box', () => {
    const r = fitImage(image({ fit: 'fill' }), 200, 50);
    expect(r).toEqual({ dx: 0, dy: 0, dw: 100, dh: 100 });
  });

  it('contain preserves ratio inside the box', () => {
    const r = fitImage(image({ fit: 'contain' }), 200, 100);
    expect(r.dw).toBe(100);
    expect(r.dh).toBe(50);
    expect(r.dy).toBe(25);
  });

  it('cover preserves ratio filling the box', () => {
    const r = fitImage(image({ fit: 'cover' }), 200, 100);
    expect(r.dw).toBe(200);
    expect(r.dh).toBe(100);
  });

  it('none centres the source at its own size', () => {
    const r = fitImage(image({ fit: 'none' }), 40, 40);
    expect(r).toEqual({ dx: 30, dy: 30, dw: 40, dh: 40 });
  });
});
