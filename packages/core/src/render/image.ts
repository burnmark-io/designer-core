import { type CanvasContextLike, type CanvasLike } from './canvas.js';
import { type ImageObject } from '../objects.js';
import { type AssetLoader } from '../assets.js';

export interface LoadedImage {
  width: number;
  height: number;
}

/**
 * Load an image from an AssetLoader by key.
 *
 * Uses `@napi-rs/canvas`'s `loadImage` on Node, and `createImageBitmap` in
 * browsers. Both return something drawable via `ctx.drawImage`.
 */
export async function loadAsset(loader: AssetLoader, key: string): Promise<LoadedImage> {
  const bytes = await loader.load(key);

  const g: {
    createImageBitmap?: (blob: Blob) => Promise<ImageBitmap>;
  } = globalThis;
  if (typeof g.createImageBitmap === 'function' && typeof Blob !== 'undefined') {
    const copy = new Uint8Array(bytes);
    const blob = new Blob([copy]);
    return g.createImageBitmap(blob);
  }

  const mod = (await import('@napi-rs/canvas')) as {
    loadImage: (src: Buffer | Uint8Array | string) => Promise<LoadedImage>;
  };
  return mod.loadImage(bytes);
}

/**
 * Render an image object at its object-local origin. Applies fit mode,
 * per-object threshold/dither/invert settings are applied during the
 * 1bpp conversion step — here we only draw the RGBA image.
 */
export function renderImage(ctx: CanvasContextLike, obj: ImageObject, image: LoadedImage): void {
  if (!obj.visible) return;

  const { dx, dy, dw, dh } = fitImage(obj, image.width, image.height);
  ctx.drawImage(image, dx, dy, dw, dh);
}

interface FitResult {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export function fitImage(obj: ImageObject, sw: number, sh: number): FitResult {
  const boxW = obj.width;
  const boxH = obj.height;

  switch (obj.fit) {
    case 'fill':
      return { dx: 0, dy: 0, dw: boxW, dh: boxH };

    case 'none':
      return {
        dx: Math.max(0, (boxW - sw) / 2),
        dy: Math.max(0, (boxH - sh) / 2),
        dw: sw,
        dh: sh,
      };

    case 'cover': {
      const ratio = Math.max(boxW / sw, boxH / sh);
      const dw = sw * ratio;
      const dh = sh * ratio;
      return { dx: (boxW - dw) / 2, dy: (boxH - dh) / 2, dw, dh };
    }

    default: {
      const ratio = Math.min(boxW / sw, boxH / sh);
      const dw = sw * ratio;
      const dh = sh * ratio;
      return { dx: (boxW - dw) / 2, dy: (boxH - dh) / 2, dw, dh };
    }
  }
}

export type { CanvasLike };
