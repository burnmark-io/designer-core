import { type BarcodeFormat, type BarcodeOptions, type ValidationResult } from '../types.js';
import { type BarcodeObject } from '../objects.js';
import { type CanvasContextLike } from './canvas.js';

/**
 * Map our public `BarcodeFormat` (underscores, TypeScript-friendly) to
 * bwip-js's native format string (mostly hyphens).
 */
const FORMAT_MAP: Record<BarcodeFormat, string> = {
  code128: 'code128',
  code128a: 'code128',
  code128b: 'code128',
  code128c: 'code128',
  code39: 'code39',
  code39ext: 'code39ext',
  code93: 'code93',
  code11: 'code11',
  codabar: 'rationalizedCodabar',
  ean13: 'ean13',
  ean8: 'ean8',
  upca: 'upca',
  upce: 'upce',
  itf14: 'itf14',
  interleaved2of5: 'interleaved2of5',
  gs1_128: 'gs1-128',
  databar: 'databaromni',
  databarexpanded: 'databarexpanded',
  pharmacode: 'pharmacode',
  msi: 'msi',
  postnet: 'postnet',
  royalmail: 'royalmail',
  kix: 'kix',
  onecode: 'onecode',
  qrcode: 'qrcode',
  microqr: 'microqrcode',
  datamatrix: 'datamatrix',
  datamatrixrectangular: 'datamatrixrectangular',
  pdf417: 'pdf417',
  micropdf417: 'micropdf417',
  azteccode: 'azteccode',
  aztecrune: 'aztecrune',
  maxicode: 'maxicode',
  dotcode: 'dotcode',
  hanxin: 'hanxincode',
  gs1qrcode: 'gs1qrcode',
  gs1datamatrix: 'gs1datamatrix',
  gs1_cc: 'gs1-cc',
  auspost: 'auspost',
  japanpost: 'japanpost',
  leitcode: 'leitcode',
  identcode: 'identcode',
  hibccode128: 'hibccode128',
  isbt128: 'isbt128',
  pzn: 'pzn',
};

interface BwipOpts {
  bcid: string;
  text: string;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: string;
  padding?: number;
  paddingwidth?: number;
  paddingheight?: number;
  includetext?: boolean;
  textsize?: number;
  textyoffset?: number;
  eclevel?: string;
  version?: number;
  rows?: number;
  columns?: number;
  height?: number;
  width?: number;
}

function buildBwipOptions(format: BarcodeFormat, data: string, options: BarcodeOptions): BwipOpts {
  const bcid = FORMAT_MAP[format];
  const opts: BwipOpts = { bcid, text: data };

  if (options.scale !== undefined) opts.scale = options.scale;
  if (options.rotate !== undefined) opts.rotate = options.rotate;
  if (options.padding !== undefined) {
    opts.paddingwidth = options.padding;
    opts.paddingheight = options.padding;
  }
  if (options.includetext !== undefined) opts.includetext = options.includetext;
  if (options.textsize !== undefined) opts.textsize = options.textsize;
  if (options.textyoffset !== undefined) opts.textyoffset = options.textyoffset;
  if (options.eclevel !== undefined) opts.eclevel = options.eclevel;
  if (options.version !== undefined) opts.version = options.version;
  if (options.rows !== undefined) opts.rows = options.rows;
  if (options.columns !== undefined) opts.columns = options.columns;

  return opts;
}

/**
 * Render a barcode to PNG bytes. Uses bwip-js's Node `toBuffer` API when
 * available; otherwise (browser) renders via `toSVG` and a `Blob`.
 */
async function barcodeToPng(opts: BwipOpts): Promise<Uint8Array> {
  const mod = (await import('bwip-js')) as unknown as {
    toBuffer?: (o: BwipOpts) => Promise<Uint8Array>;
    toSVG?: (o: BwipOpts) => string;
  };

  if (typeof mod.toBuffer === 'function') {
    const buf = await mod.toBuffer(opts);
    return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  }

  // Browser fallback: no PNG generation without additional tooling; return SVG bytes
  // and let the caller choose how to decode. For now, throw — the call site in the
  // browser render path uses the canvas-drawing route directly.
  throw new Error('bwip-js: no toBuffer available; browser path must use toCanvas directly');
}

/**
 * Barcode rendering engine. Renders barcodes into an intermediate
 * `Image`-like object that can be drawn onto the main canvas via
 * `ctx.drawImage`.
 */
export class BarcodeEngine {
  /**
   * Render a barcode to an image decodable by the platform canvas.
   * Returns `unknown` because the concrete type differs between Node
   * (`@napi-rs/canvas` Image) and browsers (ImageBitmap).
   */
  async renderToImage(
    format: BarcodeFormat,
    data: string,
    options: BarcodeOptions = {},
  ): Promise<{ image: unknown; width: number; height: number }> {
    const opts = buildBwipOptions(format, data, options);

    // Prefer Node path (toBuffer → decode via @napi-rs/canvas)
    const g: {
      createImageBitmap?: (blob: Blob) => Promise<ImageBitmap>;
    } = globalThis;

    if (typeof g.createImageBitmap === 'function' && typeof Blob !== 'undefined') {
      // Browser: render SVG via toSVG, wrap as Blob, decode as ImageBitmap.
      const bwip = (await import('bwip-js')) as {
        toSVG: (o: BwipOpts) => string;
      };
      const svg = bwip.toSVG(opts);
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const bitmap = await g.createImageBitmap(blob);
      return { image: bitmap, width: bitmap.width, height: bitmap.height };
    }

    // Node path
    const png = await barcodeToPng(opts);
    const napi = (await import('@napi-rs/canvas')) as {
      loadImage: (src: Uint8Array) => Promise<{ width: number; height: number }>;
    };
    const img = await napi.loadImage(png);
    return { image: img, width: img.width, height: img.height };
  }

  async validate(
    format: BarcodeFormat,
    data: string,
    options: BarcodeOptions = {},
  ): Promise<ValidationResult> {
    try {
      await this.renderToImage(format, data, options);
      return { valid: true, missing: [], unused: [], warnings: [] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        valid: false,
        missing: [],
        unused: [],
        warnings: [],
        errors: [message],
      };
    }
  }
}

/** Draw a barcode object at its object-local origin, fitting to its box. */
export async function renderBarcode(
  ctx: CanvasContextLike,
  obj: BarcodeObject,
  engine: BarcodeEngine,
): Promise<void> {
  if (!obj.visible) return;
  const { image, width, height } = await engine.renderToImage(obj.format, obj.data, obj.options);
  // Fit barcode into object bounds with contain semantics, preserving aspect ratio.
  const ratio = Math.min(obj.width / width, obj.height / height);
  const dw = width * ratio;
  const dh = height * ratio;
  const dx = (obj.width - dw) / 2;
  const dy = (obj.height - dh) / 2;
  ctx.drawImage(image, dx, dy, dw, dh);
}
