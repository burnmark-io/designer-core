import { describe, expect, it } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { type CanvasContextLike } from '../render/canvas.js';
import {
  layoutText,
  measureText,
  measureTextObject,
  paintText,
  renderText,
  setMeasurementContext,
} from '../render/text.js';
import { LabelDesigner } from '../designer.js';
import { type TextObject } from '../objects.js';

const W = 240;
const H = 160;

const textObj = (overrides: Partial<TextObject> = {}): TextObject => ({
  id: 't',
  type: 'text',
  x: 0,
  y: 0,
  width: 200,
  height: 120,
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

/** renderText as of designer-core 0.5.1, frozen as the refactor reference. */
function legacyRenderText(ctx: CanvasContextLike, obj: TextObject): void {
  if (!obj.visible) return;
  const fontSize = obj.fontSize;
  ctx.font = `${obj.fontStyle} ${obj.fontWeight} ${String(obj.fontSize)}px "${obj.fontFamily}"`;
  ctx.fillStyle = obj.color;
  ctx.textAlign = obj.textAlign;
  ctx.textBaseline = 'alphabetic';
  const lines = obj.wrap ? legacyWrap(ctx, obj.content, obj.width) : obj.content.split('\n');
  const lineHeight = fontSize * obj.lineHeight;
  const totalHeight = lines.length * lineHeight;
  let y = fontSize;
  if (obj.verticalAlign === 'middle') y = (obj.height - totalHeight) / 2 + fontSize;
  if (obj.verticalAlign === 'bottom') y = obj.height - totalHeight + fontSize;
  const x = obj.textAlign === 'center' ? obj.width / 2 : obj.textAlign === 'right' ? obj.width : 0;
  if (obj.invert) {
    ctx.fillRect(0, 0, obj.width, obj.height);
    ctx.fillStyle = '#ffffff';
  }
  for (const [i, line] of lines.entries()) ctx.fillText(line, x, y + i * lineHeight);
}

function legacyWrap(ctx: CanvasContextLike, text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return text.split('\n');
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    let current = '';
    for (const word of paragraph.split(/\s+/)) {
      const candidate = current.length === 0 ? word : `${current} ${word}`;
      if (ctx.measureText(candidate).width > maxWidth && current.length > 0) {
        out.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    out.push(current);
  }
  return out;
}

function paint(fn: (ctx: CanvasContextLike, obj: TextObject) => void, obj: TextObject): Buffer {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.translate(20, 20);
  fn(ctx, obj);
  return Buffer.from(ctx.getImageData(0, 0, W, H).data);
}

const ALIGNS = ['left', 'center', 'right'] as const;
const VALIGNS = ['top', 'middle', 'bottom'] as const;

const fixtures: [string, Partial<TextObject>][] = [];
for (const textAlign of ALIGNS) {
  for (const verticalAlign of VALIGNS) {
    fixtures.push([`wrap ${textAlign}/${verticalAlign}`, { textAlign, verticalAlign }]);
    fixtures.push([
      `hard newlines ${textAlign}/${verticalAlign}`,
      { textAlign, verticalAlign, wrap: false, content: 'one\ntwo lines\nthree' },
    ]);
  }
}
fixtures.push(
  ['invert', { invert: true, content: 'inverted text', textAlign: 'center' }],
  ['large font overflowing box', { fontSize: 50, content: 'Big overflowing text here' }],
  ['bold italic', { fontWeight: 'bold', fontStyle: 'italic', textAlign: 'right' }],
  ['empty', { content: '' }],
  ['tall lineHeight', { lineHeight: 2, verticalAlign: 'middle' }],
  ['width 0 disables wrap', { width: 0, content: 'no wrap at all here' }],
);

describe('layoutText + paintText — refactor guard', () => {
  it.each(fixtures)('matches legacy renderText pixels: %s', (_name, overrides) => {
    const obj = textObj(overrides);
    const actual = paint(renderText, obj);
    expect(actual.equals(paint(legacyRenderText, obj))).toBe(true);
    // Guard against a vacuous pass on a blank canvas.
    if (obj.content !== '') expect(actual.some(v => v < 128)).toBe(true);
  });
});

describe('layoutText', () => {
  const ctx = createCanvas(1, 1).getContext('2d') as unknown as CanvasContextLike;

  it('reports contentHeight as lines × lineHeight', () => {
    const l = layoutText(ctx, textObj({ wrap: false, content: 'a\nb\nc', fontSize: 10 }));
    expect(l.lines).toHaveLength(3);
    expect(l.lineHeight).toBe(12);
    expect(l.contentHeight).toBe(36);
  });

  it('places the first top-aligned baseline at fontSize', () => {
    const l = layoutText(ctx, textObj({ fontSize: 20 }));
    expect(l.lines[0]?.baselineY).toBe(20);
  });

  it('resolves alignment into x', () => {
    const left = layoutText(ctx, textObj({ wrap: false, content: 'x' })).lines[0];
    const right = layoutText(ctx, textObj({ wrap: false, content: 'x', textAlign: 'right' }))
      .lines[0];
    expect(left?.x).toBe(0);
    expect(right && right.x + right.width).toBeCloseTo(200);
  });

  it('keeps an empty object at one line', () => {
    expect(layoutText(ctx, textObj({ content: '' })).lines).toHaveLength(1);
  });
});

describe('layoutText — wrap policy', () => {
  const ctx = createCanvas(1, 1).getContext('2d') as unknown as CanvasContextLike;
  const texts = (o: Partial<TextObject>): string[] =>
    layoutText(ctx, textObj(o)).lines.map(l => l.text);

  it('preserves runs of whitespace inside a line', () => {
    expect(texts({ content: 'a   b\tc', width: 1000 })).toEqual(['a   b\tc']);
  });

  it('preserves leading indentation', () => {
    expect(texts({ content: '  indented', width: 1000 })).toEqual(['  indented']);
  });

  it('drops whitespace at a wrap point', () => {
    const word = layoutText(ctx, textObj({ content: 'aaaa', wrap: false })).lines[0]!.width;
    const lines = texts({ content: 'aaaa      bbbb', width: word + 2 });
    expect(lines).toEqual(['aaaa', 'bbbb']);
  });

  it('lets trailing whitespace hang (no effect on right alignment)', () => {
    const a = layoutText(ctx, textObj({ content: 'x   ', textAlign: 'right' })).lines[0];
    const b = layoutText(ctx, textObj({ content: 'x', textAlign: 'right' })).lines[0];
    expect(a?.text).toBe('x');
    expect(a?.x).toBe(b?.x);
  });

  it('breaks a word wider than the box between characters', () => {
    const lines = texts({ content: 'abcdefghijklmnopqrstuvwxyz', width: 60 });
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join('')).toBe('abcdefghijklmnopqrstuvwxyz');
    for (const l of layoutText(ctx, textObj({ content: lines.join('\n'), wrap: false })).lines)
      expect(l.width).toBeLessThanOrEqual(60);
  });

  it('continues after a broken word on the same line when it fits', () => {
    const lines = texts({ content: 'abcdefghijklmnopqrstuvwxyz a', width: 60 });
    expect(lines.at(-1)?.endsWith(' a')).toBe(true);
  });

  it('keeps at least one character per line in a very narrow box', () => {
    expect(texts({ content: 'WW', width: 1 })).toEqual(['W', 'W']);
  });

  it('wrap: false only breaks at hard newlines', () => {
    expect(texts({ wrap: false, content: 'a very long line indeed\nnext', width: 10 })).toEqual([
      'a very long line indeed',
      'next',
    ]);
  });
});

describe('layoutText — letterSpacing', () => {
  const ctx = createCanvas(1, 1).getContext('2d') as unknown as CanvasContextLike;

  it('widens a line by (chars − 1) × spacing', () => {
    const plain = layoutText(ctx, textObj({ content: 'abcd' })).lines[0]!.width;
    const spaced = layoutText(ctx, textObj({ content: 'abcd', letterSpacing: 5 })).lines[0]!.width;
    expect(spaced - plain).toBeCloseTo(15, 0);
  });

  it('moves wrap points', () => {
    const o = { content: 'aa bb cc dd ee ff', width: 80 };
    const plain = layoutText(ctx, textObj(o)).lines.length;
    const spaced = layoutText(ctx, textObj({ ...o, letterSpacing: 6 })).lines.length;
    expect(spaced).toBeGreaterThan(plain);
  });

  it('paints wider ink', () => {
    const inkRight = (letterSpacing: number): number => {
      const buf = paint(renderText, textObj({ content: 'abcd', letterSpacing }));
      let max = -1;
      for (let i = 0; i < buf.length; i += 4) if (buf[i]! < 128) max = Math.max(max, (i / 4) % W);
      return max;
    };
    expect(inkRight(5) - inkRight(0)).toBeGreaterThanOrEqual(13);
  });

  it('centres the ink, not the trailing spacing', () => {
    const l = layoutText(ctx, textObj({ content: 'abcd', letterSpacing: 10, textAlign: 'center' }))
      .lines[0]!;
    expect(l.x + l.width / 2).toBeCloseTo(100);
  });

  it('falls back to per-glyph painting without ctx.letterSpacing', () => {
    const native = createCanvas(W, H).getContext('2d');
    const calls: string[] = [];
    // A context that hides `letterSpacing` and records fillText.
    const legacy = new Proxy(native, {
      get(target, prop) {
        if (prop === 'letterSpacing') return;
        const v = Reflect.get(target, prop) as unknown;
        if (prop === 'fillText') {
          return (t: string, x: number, y: number) => {
            calls.push(t);
            target.fillText(t, x, y);
          };
        }
        return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
      },
      set(target, prop, value) {
        if (prop === 'letterSpacing') return true;
        return Reflect.set(target, prop, value);
      },
    }) as unknown as CanvasContextLike;
    const obj = textObj({ content: 'abcd', letterSpacing: 5 });
    const layout = layoutText(legacy, obj);
    const nativeWidth = layoutText(native, obj).lines[0]!.width;
    expect(layout.lines[0]!.width).toBeCloseTo(nativeWidth, 0);
    paintText(legacy, obj, layout);
    expect(calls).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('layoutText — autoHeight', () => {
  const ctx = createCanvas(1, 1).getContext('2d') as unknown as CanvasContextLike;

  it('uses contentHeight as the box height', () => {
    const l = layoutText(
      ctx,
      textObj({ autoHeight: true, height: 500, wrap: false, content: 'a\nb', fontSize: 10 }),
    );
    expect(l.boxHeight).toBe(24);
    expect(l.contentHeight).toBe(24);
  });

  it('ignores a stale stored height for vertical alignment', () => {
    const base = { wrap: false, content: 'x', verticalAlign: 'bottom' as const, fontSize: 10 };
    const stale = layoutText(ctx, textObj({ ...base, autoHeight: true, height: 500 }));
    const exact = layoutText(ctx, textObj({ ...base, autoHeight: false, height: 12 }));
    expect(stale.lines[0]?.baselineY).toBe(exact.lines[0]?.baselineY);
  });

  it('keeps the stored height when autoHeight is off', () => {
    expect(layoutText(ctx, textObj({ height: 77 })).boxHeight).toBe(77);
  });

  it('fills only the content box when inverted', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 100, heightDots: 100 } });
    const { id, ...input } = textObj({
      invert: true,
      autoHeight: true,
      height: 100,
      width: 100,
      content: 'x',
      wrap: false,
      fontSize: 10,
    });
    void id;
    d.add(input);
    const img = await d.render();
    const at = (x: number, y: number): number => img.data[(y * img.width + x) * 4]!;
    expect(at(90, 5)).toBeLessThan(128); // inside the 12-dot content box
    expect(at(90, 50)).toBeGreaterThan(128); // below it: not filled
  });
});

describe('measureText wrappers', () => {
  it('throws a helpful error without a context in Node', () => {
    setMeasurementContext(null);
    expect(() => measureTextObject(textObj())).toThrow(/setMeasurementContext/);
  });

  it('returns the amendment shape from the injected context', () => {
    const ctx = createCanvas(1, 1).getContext('2d') as unknown as CanvasContextLike;
    setMeasurementContext(ctx);
    try {
      const obj = textObj({ wrap: false, content: 'a\nb', fontSize: 10 });
      expect(measureTextObject(obj)).toEqual({ lines: ['a', 'b'], lineCount: 2, height: 24 });
      expect(
        measureText({
          content: obj.content,
          fontFamily: obj.fontFamily,
          fontSize: 10,
          fontStyle: 'normal',
          fontWeight: 'normal',
          lineHeight: 1.2,
          width: 0,
        }),
      ).toEqual({ lines: ['a', 'b'], lineCount: 2, height: 24 });
      expect(measureTextObject(textObj({ content: '' })).lineCount).toBe(1);
    } finally {
      setMeasurementContext(null);
    }
  });
});

describe('layoutText — robustness', () => {
  const ctx = createCanvas(1, 1).getContext('2d') as unknown as CanvasContextLike;

  it('treats a missing letterSpacing as 0 and a missing lineHeight as 1', () => {
    const obj = textObj({ content: 'hello big world', textAlign: 'center', width: 1000 });
    const broken = {
      ...obj,
      letterSpacing: undefined,
      lineHeight: undefined,
    } as unknown as TextObject;
    const l = layoutText(ctx, broken);
    expect(l.lines.map(x => x.text)).toEqual(['hello big world']);
    expect(Number.isFinite(l.lines[0]!.x)).toBe(true);
    expect(l.lineHeight).toBe(16);
  });

  it('does not wrap at a no-break space', () => {
    const word = layoutText(ctx, textObj({ content: '10', wrap: false })).lines[0]!.width;
    const lines = layoutText(ctx, textObj({ content: '10 kg', width: word + 4 })).lines;
    expect(lines.map(l => l.text).join('')).toBe('10 kg');
    expect(lines.every(l => !l.text.startsWith('kg'))).toBe(true);
  });

  it('rounds tiny letterSpacing to a value canvas accepts', () => {
    const l = layoutText(ctx, textObj({ content: 'abcd', letterSpacing: 1e-7 }));
    expect(l.letterSpacing).toBe(0);
    const plain = layoutText(ctx, textObj({ content: 'abcd' }));
    expect(l.lines[0]!.width).toBeCloseTo(plain.lines[0]!.width, 5);
  });

  it('handles negative letterSpacing', () => {
    const plain = layoutText(ctx, textObj({ content: 'abcd' })).lines[0]!.width;
    const tight = layoutText(ctx, textObj({ content: 'abcd', letterSpacing: -2 })).lines[0]!.width;
    expect(plain - tight).toBeCloseTo(6, 0);
  });
});
