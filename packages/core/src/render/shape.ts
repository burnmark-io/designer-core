import { type CanvasContextLike } from './canvas.js';
import { type ShapeObject } from '../objects.js';

/**
 * Render a shape (rectangle, ellipse, line) at its object-local origin.
 *
 * For lines, `lineDirection` determines the path:
 *   - `'horizontal'`: centre horizontal across the object
 *   - `'vertical'`:   centre vertical
 *   - `'diagonal-ltr'`: top-left → bottom-right
 *   - `'diagonal-rtl'`: bottom-left → top-right
 */
export function renderShape(ctx: CanvasContextLike, obj: ShapeObject): void {
  if (!obj.visible) return;

  ctx.fillStyle = obj.invert ? '#ffffff' : obj.color;
  ctx.strokeStyle = obj.invert ? '#ffffff' : obj.color;
  ctx.lineWidth = obj.strokeWidth;

  if (obj.invert) {
    ctx.save();
    ctx.fillStyle = obj.color;
    ctx.fillRect(0, 0, obj.width, obj.height);
    ctx.restore();
  }

  switch (obj.shape) {
    case 'rectangle':
      renderRectangle(ctx, obj);
      return;
    case 'ellipse':
      renderEllipse(ctx, obj);
      return;
    case 'line':
      renderLine(ctx, obj);
      return;
  }
}

function renderRectangle(ctx: CanvasContextLike, obj: ShapeObject): void {
  const r = obj.cornerRadius ?? 0;
  const w = obj.width;
  const h = obj.height;

  if (r > 0) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(w - radius, 0);
    ctx.quadraticCurveTo(w, 0, w, radius);
    ctx.lineTo(w, h - radius);
    ctx.quadraticCurveTo(w, h, w - radius, h);
    ctx.lineTo(radius, h);
    ctx.quadraticCurveTo(0, h, 0, h - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
  } else {
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.closePath();
  }

  if (obj.fill) ctx.fill();
  else ctx.stroke();
}

function renderEllipse(ctx: CanvasContextLike, obj: ShapeObject): void {
  const cx = obj.width / 2;
  const cy = obj.height / 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, obj.width / 2, obj.height / 2, 0, 0, Math.PI * 2);
  ctx.closePath();
  if (obj.fill) ctx.fill();
  else ctx.stroke();
}

function renderLine(ctx: CanvasContextLike, obj: ShapeObject): void {
  const direction = obj.lineDirection ?? 'horizontal';
  ctx.beginPath();
  switch (direction) {
    case 'vertical':
      ctx.moveTo(obj.width / 2, 0);
      ctx.lineTo(obj.width / 2, obj.height);
      break;
    case 'diagonal-ltr':
      ctx.moveTo(0, 0);
      ctx.lineTo(obj.width, obj.height);
      break;
    case 'diagonal-rtl':
      ctx.moveTo(0, obj.height);
      ctx.lineTo(obj.width, 0);
      break;
    default:
      ctx.moveTo(0, obj.height / 2);
      ctx.lineTo(obj.width, obj.height / 2);
  }
  ctx.stroke();
}
