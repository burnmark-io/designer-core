import { type RawImageData } from '../types.js';
import { type LabelDocument } from '../document.js';
import { renderFull, type RenderOptions } from '../render/pipeline.js';

/**
 * Export a full-colour PNG. Returns a Blob that can be saved to disk or
 * served directly in a browser.
 *
 * On Node.js this goes via `@napi-rs/canvas`'s `toBuffer('image/png')`.
 * In browsers, `OffscreenCanvas.convertToBlob({ type: 'image/png' })`.
 */
export async function exportPng(
  doc: LabelDocument,
  options: RenderOptions & { scale?: number } = {},
): Promise<Blob> {
  const image = await renderFull(doc, options);
  const scale = options.scale ?? 1;
  if (scale === 1) {
    return await rgbaToPng(image);
  }
  // For scale != 1, re-render onto a scaled canvas then encode.
  return await rgbaToPngScaled(image, scale);
}

async function rgbaToPng(image: RawImageData): Promise<Blob> {
  const g: {
    OffscreenCanvas?: new (w: number, h: number) => OffscreenCanvas;
  } = globalThis;
  if (typeof g.OffscreenCanvas === 'function') {
    const canvas = new g.OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context on OffscreenCanvas');
    const imgData = new ImageData(
      image.data instanceof Uint8ClampedArray ? image.data : new Uint8ClampedArray(image.data),
      image.width,
      image.height,
    );
    ctx.putImageData(imgData, 0, 0);
    return await canvas.convertToBlob({ type: 'image/png' });
  }

  // Node path
  const mod = (await import('@napi-rs/canvas')) as unknown as {
    createCanvas: (
      w: number,
      h: number,
    ) => {
      getContext: (id: '2d') => {
        putImageData: (data: unknown, x: number, y: number) => void;
        createImageData: (w: number, h: number) => { data: Uint8ClampedArray };
      };
      toBuffer: (mime: 'image/png') => Buffer;
    };
    ImageData: new (data: Uint8ClampedArray, w: number, h: number) => unknown;
  };
  const canvas = mod.createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  const src =
    image.data instanceof Uint8ClampedArray ? image.data : new Uint8ClampedArray(image.data);
  const imgData = new mod.ImageData(src, image.width, image.height);
  ctx.putImageData(imgData, 0, 0);
  const png = canvas.toBuffer('image/png');
  return new Blob([png], { type: 'image/png' });
}

async function rgbaToPngScaled(image: RawImageData, scale: number): Promise<Blob> {
  const w = Math.round(image.width * scale);
  const h = Math.round(image.height * scale);

  const g: {
    OffscreenCanvas?: new (w: number, h: number) => OffscreenCanvas;
  } = globalThis;
  if (typeof g.OffscreenCanvas === 'function') {
    const src = new g.OffscreenCanvas(image.width, image.height);
    const sctx = src.getContext('2d');
    if (!sctx) throw new Error('No 2D context');
    const srcData =
      image.data instanceof Uint8ClampedArray ? image.data : new Uint8ClampedArray(image.data);
    sctx.putImageData(new ImageData(srcData, image.width, image.height), 0, 0);

    const dst = new g.OffscreenCanvas(w, h);
    const dctx = dst.getContext('2d');
    if (!dctx) throw new Error('No 2D context');
    dctx.imageSmoothingEnabled = false;
    dctx.drawImage(src, 0, 0, w, h);
    return await dst.convertToBlob({ type: 'image/png' });
  }

  const mod = (await import('@napi-rs/canvas')) as unknown as {
    createCanvas: (w: number, h: number) => unknown;
    ImageData: new (data: Uint8ClampedArray, w: number, h: number) => unknown;
  };
  interface NodeCanvas {
    getContext: (id: '2d') => {
      putImageData: (data: unknown, x: number, y: number) => void;
      drawImage: (img: unknown, x: number, y: number, w: number, h: number) => void;
      imageSmoothingEnabled: boolean;
    };
    toBuffer: (mime: 'image/png') => Buffer;
  }
  const src = mod.createCanvas(image.width, image.height) as NodeCanvas;
  const srcData =
    image.data instanceof Uint8ClampedArray ? image.data : new Uint8ClampedArray(image.data);
  src.getContext('2d').putImageData(new mod.ImageData(srcData, image.width, image.height), 0, 0);
  const dst = mod.createCanvas(w, h) as NodeCanvas;
  const dctx = dst.getContext('2d');
  dctx.imageSmoothingEnabled = false;
  dctx.drawImage(src, 0, 0, w, h);
  const png = dst.toBuffer('image/png');
  return new Blob([png], { type: 'image/png' });
}
