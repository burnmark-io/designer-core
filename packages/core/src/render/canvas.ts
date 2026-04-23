import { type RawImageData } from '../types.js';

/**
 * Minimal 2D canvas surface used by the render pipeline. Intentionally
 * narrow: it's the overlap of OffscreenCanvas (browser) and @napi-rs/canvas
 * (Node.js). We never reach outside of this surface from render code.
 */
export interface CanvasLike {
  readonly width: number;
  readonly height: number;
  getContext(contextId: '2d'): CanvasContextLike | null;
}

/**
 * 2D context surface. A superset of what we use on both platforms; the
 * native types are looser than TypeScript's DOM lib, so we re-declare the
 * structural shape we depend on.
 */
export interface CanvasContextLike {
  canvas: CanvasLike;

  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  globalAlpha: number;

  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;

  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;

  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  rect(x: number, y: number, width: number, height: number): void;
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    anticlockwise?: boolean,
  ): void;
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    anticlockwise?: boolean,
  ): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;

  fill(): void;
  stroke(): void;

  fillRect(x: number, y: number, width: number, height: number): void;
  clearRect(x: number, y: number, width: number, height: number): void;

  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  measureText(text: string): {
    width: number;
    actualBoundingBoxAscent?: number;
    actualBoundingBoxDescent?: number;
  };

  drawImage(image: unknown, dx: number, dy: number): void;
  drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void;
  drawImage(
    image: unknown,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;

  getImageData(sx: number, sy: number, sw: number, sh: number): RawImageData;
  createImageData(width: number, height: number): RawImageData;
  putImageData(imageData: unknown, dx: number, dy: number): void;
}

/**
 * Create a canvas surface for rendering. Uses `OffscreenCanvas` in browsers
 * (required: Safari 16.4+, Chrome 69+, Firefox 105+). In Node.js, lazily
 * imports `@napi-rs/canvas`.
 *
 * Throws if neither is available.
 */
export async function createCanvas(width: number, height: number): Promise<CanvasLike> {
  const g: { OffscreenCanvas?: new (w: number, h: number) => CanvasLike } = globalThis;
  if (typeof g.OffscreenCanvas === 'function') {
    return new g.OffscreenCanvas(width, height);
  }
  try {
    const mod = (await import('@napi-rs/canvas')) as {
      createCanvas: (w: number, h: number) => CanvasLike;
    };
    return mod.createCanvas(width, height);
  } catch {
    throw new Error(
      'No canvas implementation available. In browsers, OffscreenCanvas is required ' +
        '(Safari 16.4+, Chrome 69+, Firefox 105+). In Node.js, install the optional ' +
        'peer dependency `@napi-rs/canvas`.',
    );
  }
}

export function context2d(canvas: CanvasLike): CanvasContextLike {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not acquire 2D canvas context');
  return ctx;
}
