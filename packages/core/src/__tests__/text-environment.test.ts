import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { type CanvasContextLike } from '../render/canvas.js';
import type * as TextModule from '../render/text.js';
import { type TextObject } from '../objects.js';
import { DefaultFontLoader } from '../fonts.js';

const realCtx = (): CanvasContextLike => createCanvas(1, 1).getContext('2d');

const textObj = (overrides: Partial<TextObject> = {}): TextObject => ({
  id: 't',
  type: 'text',
  x: 0,
  y: 0,
  width: 200,
  height: 50,
  rotation: 0,
  opacity: 1,
  locked: false,
  visible: true,
  color: '#000000',
  content: 'abc',
  fontFamily: 'Burnmark Sans',
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

// Each test loads a fresh module so its cached context / segmenter start clean.
async function loadText(): Promise<typeof TextModule> {
  vi.resetModules();
  return import('../render/text.js');
}

// A bundled font, so widths are real on machines without system fonts (CI).
beforeAll(async () => {
  await new DefaultFontLoader().load('Burnmark Sans');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getMeasurementContext in a browser', () => {
  it('prefers OffscreenCanvas and caches it', async () => {
    const ctx = realCtx();
    const ctor = vi.fn(() => ({ getContext: () => ctx }));
    vi.stubGlobal('OffscreenCanvas', ctor);
    const { getMeasurementContext } = await loadText();
    expect(getMeasurementContext()).toBe(ctx);
    expect(getMeasurementContext()).toBe(ctx);
    expect(ctor).toHaveBeenCalledTimes(1);
  });

  it('falls back to a detached <canvas> without OffscreenCanvas', async () => {
    const ctx = realCtx();
    // Node has no OffscreenCanvas, so only `document` needs faking.
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
    const { getMeasurementContext } = await loadText();
    expect(getMeasurementContext()).toBe(ctx);
  });
});

describe('without Intl.Segmenter', () => {
  it('still breaks an over-wide word per character', async () => {
    vi.stubGlobal('Intl', {});
    const { layoutText } = await loadText();
    const lines = layoutText(realCtx(), textObj({ content: 'abcdefghijklmnop', width: 30 })).lines;
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.map(l => l.text).join('')).toBe('abcdefghijklmnop');
  });
});
