import { type CanvasContextLike } from './canvas.js';
import { type TextObject } from '../objects.js';

/**
 * Render a text object to the provided 2D context. Handles word wrapping,
 * line height, alignment, and vertical alignment within the object's bounds.
 *
 * The context should already be translated to the object's top-left before
 * calling; coordinates inside this function are relative to that origin.
 */
export function renderText(ctx: CanvasContextLike, obj: TextObject): void {
  if (!obj.visible) return;

  const fontSize = obj.fontSize;
  ctx.font = buildFont(obj);
  ctx.fillStyle = obj.color;
  ctx.textAlign = obj.textAlign;
  ctx.textBaseline = 'alphabetic';

  const lines = obj.wrap ? wrapLines(ctx, obj.content, obj.width) : obj.content.split('\n');
  const lineHeight = fontSize * obj.lineHeight;
  const totalHeight = lines.length * lineHeight;

  let y: number;
  switch (obj.verticalAlign) {
    case 'middle':
      y = (obj.height - totalHeight) / 2 + fontSize;
      break;
    case 'bottom':
      y = obj.height - totalHeight + fontSize;
      break;
    default:
      y = fontSize;
  }

  let x: number;
  switch (obj.textAlign) {
    case 'center':
      x = obj.width / 2;
      break;
    case 'right':
      x = obj.width;
      break;
    default:
      x = 0;
  }

  if (obj.invert) {
    ctx.save();
    ctx.fillStyle = obj.color;
    ctx.fillRect(0, 0, obj.width, obj.height);
    ctx.fillStyle = '#ffffff';
    for (const [i, line] of lines.entries()) {
      ctx.fillText(line, x, y + i * lineHeight);
    }
    ctx.restore();
    return;
  }

  for (const [i, line] of lines.entries()) {
    ctx.fillText(line, x, y + i * lineHeight);
  }
}

function buildFont(obj: TextObject): string {
  const weight = obj.fontWeight;
  const style = obj.fontStyle;
  return `${style} ${weight} ${String(obj.fontSize)}px "${obj.fontFamily}"`;
}

function wrapLines(ctx: CanvasContextLike, text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return text.split('\n');
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/);
    let current = '';
    for (const word of words) {
      const candidate = current.length === 0 ? word : `${current} ${word}`;
      const metrics = ctx.measureText(candidate);
      if (metrics.width > maxWidth && current.length > 0) {
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
