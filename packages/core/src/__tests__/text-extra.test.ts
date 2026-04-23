import { describe, expect, it } from 'vitest';
import { LabelDesigner } from '../designer.js';
import { type LabelObjectInput, type TextObject } from '../objects.js';

const textInput = (overrides: Partial<TextObject> = {}): LabelObjectInput<TextObject> => ({
  type: 'text',
  x: 0,
  y: 0,
  width: 200,
  height: 60,
  rotation: 0,
  opacity: 1,
  locked: false,
  visible: true,
  color: '#000000',
  content: 'Hello, world! This is a long line to force wrapping when width is tight.',
  fontFamily: 'sans-serif',
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'left',
  verticalAlign: 'top',
  letterSpacing: 0,
  lineHeight: 1.2,
  invert: false,
  wrap: true,
  autoHeight: false,
  ...overrides,
});

describe('text rendering — variants', () => {
  it('renders with wrap + left alignment', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 100, heightDots: 60 } });
    d.add(textInput({ width: 100 }));
    const img = await d.render();
    expect(img.width).toBe(100);
  });

  it('renders centre-aligned', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 60 } });
    d.add(textInput({ textAlign: 'center', wrap: false, content: 'centre' }));
    const img = await d.render();
    expect(img.width).toBe(200);
  });

  it('renders right-aligned', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 60 } });
    d.add(textInput({ textAlign: 'right', wrap: false, content: 'right' }));
    const img = await d.render();
    expect(img.width).toBe(200);
  });

  it('renders middle-vertically aligned', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 60 } });
    d.add(textInput({ verticalAlign: 'middle', wrap: false, content: 'v-mid' }));
    const img = await d.render();
    expect(img.height).toBe(60);
  });

  it('renders bottom-vertically aligned', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 60 } });
    d.add(textInput({ verticalAlign: 'bottom', wrap: false, content: 'v-bot' }));
    const img = await d.render();
    expect(img.height).toBe(60);
  });

  it('renders inverted (white on black)', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 60 } });
    d.add(textInput({ invert: true, wrap: false, content: 'inverted' }));
    const img = await d.render();
    expect(img.width).toBe(200);
  });

  it('renders rotated', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 200 } });
    d.add(
      textInput({
        rotation: 45,
        wrap: false,
        content: '45°',
        x: 50,
        y: 50,
        width: 100,
        height: 40,
      }),
    );
    const img = await d.render();
    expect(img.width).toBe(200);
  });

  it('handles bold + italic styles', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 60 } });
    d.add(textInput({ fontWeight: 'bold', fontStyle: 'italic', wrap: false, content: 'styled' }));
    const img = await d.render();
    expect(img.width).toBe(200);
  });
});
