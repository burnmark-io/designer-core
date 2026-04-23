import {
  type GroupObject,
  type ImageObject,
  type LabelObject,
  isBarcodeObject,
  isGroupObject,
  isImageObject,
  isShapeObject,
  isTextObject,
} from '../objects.js';
import { type AssetLoader } from '../assets.js';
import { type CanvasContextLike } from './canvas.js';
import { renderText } from './text.js';
import { renderShape } from './shape.js';
import { renderImage, loadAsset } from './image.js';
import { renderBarcode, type BarcodeEngine } from './barcode.js';

export interface RenderContext {
  ctx: CanvasContextLike;
  assetLoader: AssetLoader;
  barcodeEngine: BarcodeEngine;
  /** Emit a warning (e.g. opacity < 1, missing font, etc.). Non-fatal. */
  warn: (code: string, message: string, objectId?: string) => void;
}

/**
 * Render a flat list of objects to the current context in z-order. Applies
 * each object's translation, rotation, and opacity before delegating to the
 * per-type renderer.
 */
export async function renderObjects(objects: LabelObject[], rc: RenderContext): Promise<void> {
  for (const obj of objects) {
    if (!obj.visible) continue;
    await renderOne(obj, rc);
  }
}

async function renderOne(obj: LabelObject, rc: RenderContext): Promise<void> {
  const { ctx } = rc;

  if (obj.opacity < 1 && obj.type !== 'image') {
    rc.warn(
      'opacity-on-thermal',
      `Object "${obj.id}" has opacity ${String(obj.opacity)}. On a 1bpp thermal ` +
        `output this becomes a dithered stipple pattern — likely not what you want. ` +
        `Set opacity to 1.0 for predictable thermal output.`,
      obj.id,
    );
  }

  ctx.save();
  ctx.translate(obj.x, obj.y);
  if (obj.rotation !== 0) {
    ctx.translate(obj.width / 2, obj.height / 2);
    ctx.rotate((obj.rotation * Math.PI) / 180);
    ctx.translate(-obj.width / 2, -obj.height / 2);
  }
  ctx.globalAlpha = obj.opacity;

  try {
    if (isTextObject(obj)) renderText(ctx, obj);
    else if (isShapeObject(obj)) renderShape(ctx, obj);
    else if (isImageObject(obj)) await renderImageObject(obj, rc);
    else if (isBarcodeObject(obj)) await renderBarcode(ctx, obj, rc.barcodeEngine);
    else if (isGroupObject(obj)) await renderGroup(obj, rc);
  } finally {
    ctx.restore();
  }
}

async function renderImageObject(obj: ImageObject, rc: RenderContext): Promise<void> {
  try {
    const image = await loadAsset(rc.assetLoader, obj.assetKey);
    renderImage(rc.ctx, obj, image);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    rc.warn('asset-load-failed', `Failed to load asset "${obj.assetKey}": ${message}`, obj.id);
  }
}

async function renderGroup(obj: GroupObject, rc: RenderContext): Promise<void> {
  // Children are in group-local coords already (their x/y are relative to the group).
  await renderObjects(obj.children, rc);
}
