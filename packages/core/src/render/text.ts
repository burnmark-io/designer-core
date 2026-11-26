import { type CanvasContextLike } from './canvas.js';
import { type TextObject } from '../objects.js';

/** The TextObject fields that affect layout; live, uncommitted values may be passed too. */
export type TextLayoutInput = Pick<
  TextObject,
  | 'content'
  | 'fontFamily'
  | 'fontSize'
  | 'fontWeight'
  | 'fontStyle'
  | 'textAlign'
  | 'verticalAlign'
  | 'letterSpacing'
  | 'lineHeight'
  | 'width'
  | 'height'
  | 'wrap'
  | 'autoHeight'
>;

/** One laid-out line, positioned in object-local dots. */
export interface LaidOutLine {
  /** Text to paint. Trailing whitespace is dropped (it hangs past the edge). */
  text: string;
  /** Left edge of the line's advance box, in object-local dots. */
  x: number;
  /** Alphabetic baseline, in object-local dots. */
  baselineY: number;
  /** Advance width, including letterSpacing between (not after) glyphs. */
  width: number;
}

/** Renderer-independent text layout: paint this and you match print. */
export interface TextLayout {
  /** The exact `ctx.font` string to paint with. */
  font: string;
  /** Extra advance between glyphs, in dots. */
  letterSpacing: number;
  /** fontSize × obj.lineHeight, in dots. */
  lineHeight: number;
  lines: LaidOutLine[];
  /** lines.length × lineHeight. */
  contentHeight: number;
  /** Width of the object box, in dots. */
  boxWidth: number;
  /** Box height in dots: `contentHeight` for autoHeight, else `height`. */
  boxHeight: number;
}

/**
 * Wrap, align and position every line. `content` is used as-is (resolve
 * templates first). Wrap policy: hard newlines break; whitespace runs are
 * kept, dropped at wrap points and hang at line ends; no-break spaces never
 * wrap; over-wide words break per grapheme; `wrap: false` or `width <= 0`
 * disables soft wrapping.
 */
export function layoutText(ctx: CanvasContextLike, obj: TextLayoutInput): TextLayout {
  const fontSize = obj.fontSize;
  const font = buildFont(obj);
  // Older documents can lack these fields; never let NaN into the layout.
  const spacing = roundSpacing(finiteOr(obj.letterSpacing, 0));
  const lineHeightFactor = finiteOr(obj.lineHeight, 1);

  ctx.save();
  try {
    ctx.font = font;
    const measure = createMeasurer(ctx, spacing);

    const paragraphs = obj.content.split('\n');
    const texts =
      obj.wrap && obj.width > 0
        ? paragraphs.flatMap(p => wrapParagraph(measure, p, obj.width))
        : paragraphs.map(p => p.trimEnd());

    const lineHeight = fontSize * lineHeightFactor;
    const contentHeight = texts.length * lineHeight;
    const boxHeight = obj.autoHeight ? contentHeight : obj.height;

    let firstBaseline: number;
    switch (obj.verticalAlign) {
      case 'middle':
        firstBaseline = (boxHeight - contentHeight) / 2 + fontSize;
        break;
      case 'bottom':
        firstBaseline = boxHeight - contentHeight + fontSize;
        break;
      default:
        firstBaseline = fontSize;
    }

    const lines = texts.map((text, i): LaidOutLine => {
      const width = measure(text);
      let x: number;
      switch (obj.textAlign) {
        case 'center':
          x = obj.width / 2 - width / 2;
          break;
        case 'right':
          x = obj.width - width;
          break;
        default:
          x = 0;
      }
      return { text, x, baselineY: firstBaseline + i * lineHeight, width };
    });

    return {
      font,
      letterSpacing: spacing,
      lineHeight,
      lines,
      contentHeight,
      boxWidth: obj.width,
      boxHeight,
    };
  } finally {
    ctx.restore();
  }
}

/** The fields {@link paintText} needs beyond the layout. */
export type TextPaintInput = Pick<TextObject, 'color' | 'invert' | 'visible'>;

/** Paint a {@link layoutText} result at the object origin, including invert. */
export function paintText(ctx: CanvasContextLike, obj: TextPaintInput, layout: TextLayout): void {
  if (!obj.visible) return;

  ctx.save();
  try {
    ctx.font = layout.font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = obj.color;
    if (obj.invert) {
      ctx.fillRect(0, 0, layout.boxWidth, layout.boxHeight);
      ctx.fillStyle = '#ffffff';
    }
    const native = supportsLetterSpacing(ctx);
    if (native) ctx.letterSpacing = `${String(layout.letterSpacing)}px`;
    for (const line of layout.lines) {
      if (native || layout.letterSpacing === 0) {
        ctx.fillText(line.text, line.x, line.baselineY);
      } else {
        // Fallback for contexts without `letterSpacing`: glyph by glyph.
        let x = line.x;
        for (const g of graphemes(line.text)) {
          ctx.fillText(g, x, line.baselineY);
          x += ctx.measureText(g).width + layout.letterSpacing;
        }
      }
    }
  } finally {
    ctx.restore();
  }
}

/** Lay out and paint a text object at the current origin. */
export function renderText(ctx: CanvasContextLike, obj: TextObject, layout?: TextLayout): void {
  if (!obj.visible) return;
  paintText(ctx, obj, layout ?? layoutText(ctx, obj));
}

export interface TextMeasurement {
  /** Wrapped lines as they would render. Hard line breaks preserved. */
  lines: string[];
  /** Number of lines (== lines.length). */
  lineCount: number;
  /** Total laid-out height in dots (lineCount × fontSize × lineHeight). */
  height: number;
}

export interface MeasureTextOptions {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontStyle: TextObject['fontStyle'];
  fontWeight: TextObject['fontWeight'];
  lineHeight: number;
  /** Box width to wrap into, in dots. ≤ 0 disables wrapping. */
  width: number;
  /** When false, only hard newlines split lines. Default true. */
  wrap?: boolean;
  /** Extra advance between glyphs, in dots. Default 0. */
  letterSpacing?: number;
}

let measurementCtx: CanvasContextLike | null = null;

/** Inject the measuring context (Node, SSR); `null` restores the default. */
export function setMeasurementContext(ctx: CanvasContextLike | null): void {
  measurementCtx = ctx;
}

/** The measuring context: injected, else OffscreenCanvas, else a detached `<canvas>`. */
export function getMeasurementContext(): CanvasContextLike {
  if (measurementCtx) return measurementCtx;
  if (typeof OffscreenCanvas !== 'undefined') {
    const ctx = new OffscreenCanvas(1, 1).getContext('2d');
    if (ctx) return (measurementCtx = ctx as unknown as CanvasContextLike);
  }
  if (typeof document !== 'undefined') {
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) return (measurementCtx = ctx as unknown as CanvasContextLike);
  }
  throw new Error(
    'designer-core: measureText() requires a canvas measurement context. ' +
      'Inject one via setMeasurementContext(ctx) in non-browser environments.',
  );
}

/** Measure wrapping and height without rendering; needs fonts loaded. */
export function measureText(opts: MeasureTextOptions): TextMeasurement {
  const layout = layoutText(getMeasurementContext(), {
    content: opts.content,
    fontFamily: opts.fontFamily,
    fontSize: opts.fontSize,
    fontStyle: opts.fontStyle,
    fontWeight: opts.fontWeight,
    lineHeight: opts.lineHeight,
    letterSpacing: opts.letterSpacing ?? 0,
    width: opts.width,
    height: 0,
    wrap: opts.wrap !== false,
    autoHeight: true,
    textAlign: 'left',
    verticalAlign: 'top',
  });
  return toMeasurement(layout);
}

/** {@link measureText} for a text object's own fields. */
export function measureTextObject(obj: TextLayoutInput): TextMeasurement {
  return toMeasurement(layoutText(getMeasurementContext(), obj));
}

function toMeasurement(layout: TextLayout): TextMeasurement {
  return {
    lines: layout.lines.map(l => l.text),
    lineCount: layout.lines.length,
    height: layout.contentHeight,
  };
}

function buildFont(
  obj: Pick<TextObject, 'fontStyle' | 'fontWeight' | 'fontSize' | 'fontFamily'>,
): string {
  return `${obj.fontStyle} ${obj.fontWeight} ${String(obj.fontSize)}px "${obj.fontFamily}"`;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Round so the value never formats in exponent form, which canvas rejects. */
function roundSpacing(spacing: number): number {
  return Math.round(spacing * 10000) / 10000;
}

/** Whitespace that may break a line; no-break spaces never do. */
const BREAKABLE_SPACE = '[^\\S\\u00A0\\u2007\\u202F]';
const WRAP_TOKENS = new RegExp(`${BREAKABLE_SPACE}+|(?:(?!${BREAKABLE_SPACE})[\\s\\S])+`, 'g');
const IS_BREAKABLE_SPACE = new RegExp(`^${BREAKABLE_SPACE}`);

function supportsLetterSpacing(ctx: CanvasContextLike): boolean {
  return typeof ctx.letterSpacing === 'string';
}

type Measurer = (text: string) => number;

/** Width with spacing between glyphs only (canvas also adds it after the last). */
function createMeasurer(ctx: CanvasContextLike, spacing: number): Measurer {
  if (spacing === 0) return text => ctx.measureText(text).width;
  if (supportsLetterSpacing(ctx)) {
    ctx.letterSpacing = `${String(spacing)}px`;
    return text => (text.length === 0 ? 0 : ctx.measureText(text).width - spacing);
  }
  return text => {
    const gs = graphemes(text);
    let w = 0;
    for (const g of gs) w += ctx.measureText(g).width;
    return gs.length === 0 ? 0 : w + spacing * (gs.length - 1);
  };
}

function wrapParagraph(measure: Measurer, paragraph: string, maxWidth: number): string[] {
  const out: string[] = [];
  let line = '';
  let pendingSpace = '';
  for (const token of paragraph.match(WRAP_TOKENS) ?? []) {
    if (IS_BREAKABLE_SPACE.test(token)) {
      pendingSpace += token;
      continue;
    }
    const candidate = line + pendingSpace + token;
    if (measure(candidate) <= maxWidth) {
      line = candidate;
      pendingSpace = '';
      continue;
    }
    // Wrap point: the whitespace before `token` is dropped.
    if (line.length > 0) out.push(line);
    line = '';
    pendingSpace = '';
    if (measure(token) <= maxWidth) {
      line = token;
      continue;
    }
    const pieces = breakWord(measure, token, maxWidth);
    out.push(...pieces.slice(0, -1));
    line = pieces.at(-1) ?? '';
  }
  out.push(line);
  return out;
}

/** Break a word into pieces no wider than `maxWidth` (at least one grapheme each). */
function breakWord(measure: Measurer, word: string, maxWidth: number): string[] {
  const pieces: string[] = [];
  let piece = '';
  for (const g of graphemes(word)) {
    if (piece.length > 0 && measure(piece + g) > maxWidth) {
      pieces.push(piece);
      piece = g;
    } else {
      piece += g;
    }
  }
  pieces.push(piece);
  return pieces;
}

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

function graphemes(text: string): string[] {
  if (segmenter) return Array.from(segmenter.segment(text), s => s.segment);
  return Array.from(text);
}
