import { type RawImageData } from '../types.js';

/**
 * Rotate an RGBA image 90° clockwise. Output dimensions are swapped:
 * the new width is the old height and vice versa.
 *
 * Used by the canvas-orientation feature: when a document's
 * `canvas.orientation === 'horizontal'`, exporters and the print
 * pipeline produce a landscape bitmap so consumers do not need to do
 * their own rotation.
 *
 * Direction (CW) is the natural choice for "tape reads left-to-right":
 * a portrait label rotated CW puts what was the top of the label on
 * the right of the resulting landscape image.
 */
export function rotate90(image: RawImageData): RawImageData {
  const { width, height } = image;
  const src = image.data instanceof Uint8Array ? image.data : new Uint8Array(image.data);
  const out = new Uint8ClampedArray(width * height * 4);
  const newWidth = height;

  for (let sy = 0; sy < height; sy++) {
    for (let sx = 0; sx < width; sx++) {
      const srcIdx = (sy * width + sx) * 4;
      const dstX = height - 1 - sy;
      const dstY = sx;
      const dstIdx = (dstY * newWidth + dstX) * 4;
      out[dstIdx] = src[srcIdx]!;
      out[dstIdx + 1] = src[srcIdx + 1]!;
      out[dstIdx + 2] = src[srcIdx + 2]!;
      out[dstIdx + 3] = src[srcIdx + 3]!;
    }
  }

  return { width: newWidth, height: width, data: out };
}
