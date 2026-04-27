import { describe, expect, it } from 'vitest';
import { rotate90 } from '../render/rotate.js';

/**
 * Build a 3×2 image with distinct RGBA values per pixel so rotation can be
 * verified without ambiguity. The R channel encodes column, G encodes row.
 *
 *   (0,0)=A (1,0)=B (2,0)=C       D A
 *   (0,1)=D (1,1)=E (2,1)=F   →   E B
 *                                 F C
 *
 * 90° CW: row 0 of source becomes the right column of the output.
 */
function makeImage(): { width: number; height: number; data: Uint8ClampedArray } {
  const width = 3;
  const height = 2;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = x * 50;
      data[i + 1] = y * 100;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

function pixelAt(
  img: { width: number; data: Uint8ClampedArray | Uint8Array },
  x: number,
  y: number,
): [number, number, number, number] {
  const i = (y * img.width + x) * 4;
  return [img.data[i] ?? 0, img.data[i + 1] ?? 0, img.data[i + 2] ?? 0, img.data[i + 3] ?? 0];
}

describe('rotate90', () => {
  it('swaps width and height', () => {
    const src = makeImage();
    const out = rotate90(src);
    expect(out.width).toBe(src.height);
    expect(out.height).toBe(src.width);
  });

  it('rotates clockwise — row 0 of source becomes the right column of output', () => {
    const src = makeImage();
    const out = rotate90(src);
    // Source (0,0) [r=0, g=0] → CW → output last column, row 0
    expect(pixelAt(out, out.width - 1, 0)).toEqual([0, 0, 0, 255]);
    // Source (2,0) [r=100, g=0] → CW → output last column, row 2
    expect(pixelAt(out, out.width - 1, 2)).toEqual([100, 0, 0, 255]);
    // Source (0,1) [r=0, g=100] → CW → output first column, row 0
    expect(pixelAt(out, 0, 0)).toEqual([0, 100, 0, 255]);
    // Source (2,1) [r=100, g=100] → CW → output first column, row 2
    expect(pixelAt(out, 0, 2)).toEqual([100, 100, 0, 255]);
  });

  it('two rotations of 90° flip width/height back, four return to identical shape', () => {
    const src = makeImage();
    const twice = rotate90(rotate90(src));
    expect(twice.width).toBe(src.width);
    expect(twice.height).toBe(src.height);
    const fourTimes = rotate90(rotate90(twice));
    expect(fourTimes.width).toBe(src.width);
    expect(fourTimes.height).toBe(src.height);
    // Pixel-perfect identity after four CW rotations.
    for (let i = 0; i < src.data.length; i++) {
      expect(fourTimes.data[i]).toBe(src.data[i]);
    }
  });
});
