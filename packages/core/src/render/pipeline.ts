import { type LabelDocument } from '../document.js';
import { type PrinterCapabilities, type RawImageData, type RenderWarning } from '../types.js';
import { type AssetLoader, InMemoryAssetLoader } from '../assets.js';
import { applyVariables } from '../template.js';
import { context2d, createCanvas, type CanvasContextLike } from './canvas.js';
import { BarcodeEngine } from './barcode.js';
import { renderObjects, type RenderContext } from './group.js';
import { partitionByPlane } from './colour.js';
import { ensureFontsLoaded } from './fonts.js';
import { renderImage as bitmapFromImage, type LabelBitmap } from '@mbtech-nl/bitmap';

export interface RenderOptions {
  variables?: Record<string, string>;
  assetLoader?: AssetLoader;
  onWarning?: (w: RenderWarning) => void;
}

/**
 * Render a document to a single full-colour RGBA canvas. No plane splitting
 * or bitmap conversion — caller is responsible for those steps.
 */
export async function renderFull(
  doc: LabelDocument,
  options: RenderOptions = {},
): Promise<RawImageData> {
  const resolved = options.variables ? applyVariables(doc, options.variables) : doc;
  await ensureFontsLoaded(resolved, options.onWarning);
  const height = resolveHeight(resolved);
  const { widthDots } = resolved.canvas;
  const canvas = await createCanvas(widthDots, height);
  const ctx = context2d(canvas);

  ctx.fillStyle = resolved.canvas.background;
  ctx.fillRect(0, 0, widthDots, height);

  const rc = buildRenderContext(ctx, options);
  await renderObjects(resolved.objects, rc);

  const rgba = ctx.getImageData(0, 0, widthDots, height);
  if (resolved.canvas.heightDots === 0) {
    return cropToContent(rgba, resolved.canvas.background);
  }
  return rgba;
}

/**
 * Render each printer plane as its own full-colour canvas.
 * For each plane, only the objects that map to that plane are rendered.
 * Returns one RawImageData per plane.
 */
export async function renderPlaneImages(
  doc: LabelDocument,
  capabilities: PrinterCapabilities,
  options: RenderOptions = {},
): Promise<Map<string, RawImageData>> {
  const resolved = options.variables ? applyVariables(doc, options.variables) : doc;
  await ensureFontsLoaded(resolved, options.onWarning);
  const height = resolveHeight(resolved);
  const { widthDots } = resolved.canvas;
  const buckets = partitionByPlane(resolved.objects, capabilities);

  const result = new Map<string, RawImageData>();
  for (const [planeName, objects] of buckets) {
    const canvas = await createCanvas(widthDots, height);
    const ctx = context2d(canvas);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthDots, height);

    const rc = buildRenderContext(ctx, options);
    await renderObjects(objects, rc);
    const rgba = ctx.getImageData(0, 0, widthDots, height);
    result.set(planeName, resolved.canvas.heightDots === 0 ? cropToContent(rgba, '#ffffff') : rgba);
  }
  return result;
}

/**
 * Convert RawImageData (RGBA) to a 1bpp `LabelBitmap` via @mbtech-nl/bitmap.
 * Uses Floyd–Steinberg dithering by default; threshold defaults to 128.
 */
export function toBitmap(
  rgba: RawImageData,
  options: { threshold?: number; dither?: boolean; invert?: boolean } = {},
): LabelBitmap {
  const bytes = rgba.data instanceof Uint8Array ? rgba.data : new Uint8Array(rgba.data);
  return bitmapFromImage(
    { width: rgba.width, height: rgba.height, data: bytes },
    {
      ...(options.threshold !== undefined ? { threshold: options.threshold } : {}),
      ...(options.dither !== undefined ? { dither: options.dither } : {}),
      ...(options.invert !== undefined ? { invert: options.invert } : {}),
    },
  );
}

/**
 * Render planes directly to 1bpp LabelBitmaps — the common case for
 * sending to a printer.
 *
 * Overlap resolution: where a non-default plane and the default (wildcard)
 * plane both have a set bit at the same position, the non-default plane
 * wins the pixel, and it is cleared from the default plane. Matches the
 * Brother QL firmware's behaviour when a red and black bit collide.
 */
export async function renderPlanes(
  doc: LabelDocument,
  capabilities: PrinterCapabilities,
  options: RenderOptions = {},
): Promise<Map<string, LabelBitmap>> {
  const imageMap = await renderPlaneImages(doc, capabilities, options);
  const planes = new Map<string, LabelBitmap>();
  for (const [name, rgba] of imageMap) {
    planes.set(name, toBitmap(rgba, { dither: true }));
  }

  const defaultPlane = capabilities.colors.find(p => p.cssMatch.includes('*'));
  if (defaultPlane) {
    const primary = planes.get(defaultPlane.name);
    if (primary) {
      for (const plane of capabilities.colors) {
        if (plane === defaultPlane) continue;
        const other = planes.get(plane.name);
        if (!other) continue;
        clearOverlap(primary, other);
      }
    }
  }

  return planes;
}

function resolveHeight(doc: LabelDocument): number {
  // For continuous labels (heightDots === 0), start with a generous scratch
  // canvas. We crop to content later via `cropToContent`.
  return doc.canvas.heightDots > 0 ? doc.canvas.heightDots : 10_000;
}

function buildRenderContext(ctx: CanvasContextLike, options: RenderOptions): RenderContext {
  const assetLoader = options.assetLoader ?? new InMemoryAssetLoader();
  const barcodeEngine = new BarcodeEngine();
  const onWarning = options.onWarning;
  return {
    ctx,
    assetLoader,
    barcodeEngine,
    warn: (code, message, objectId) => {
      if (onWarning) {
        const payload: RenderWarning = {
          code,
          message,
          ...(objectId !== undefined ? { objectId } : {}),
        };
        onWarning(payload);
      }
    },
  };
}

/**
 * For continuous-length labels: crop to the lowest non-background row
 * plus a small margin. If nothing is drawn, returns a 1-row image.
 */
function cropToContent(rgba: RawImageData, background: string): RawImageData {
  const bgRgb = parseCssColor(background);
  const { width, height, data } = rgba;
  let lastNonBg = -1;

  outer: for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (!isApproxEqual(data, i, bgRgb)) {
        lastNonBg = y;
        break outer;
      }
    }
  }

  const newHeight = Math.max(lastNonBg + 2, 1);
  if (newHeight === height) return rgba;
  const src = data instanceof Uint8Array ? data : new Uint8Array(data);
  const cropped = src.slice(0, width * newHeight * 4);
  return { width, height: newHeight, data: cropped };
}

function parseCssColor(css: string): [number, number, number] {
  const s = css.trim().toLowerCase();
  if (s === 'white' || s === '#ffffff' || s === '#fff') return [255, 255, 255];
  if (s === 'black' || s === '#000000' || s === '#000') return [0, 0, 0];
  const hexMatch = /^#([\da-f]{6})$/.exec(s);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex) {
      return [
        Number.parseInt(hex.slice(0, 2), 16),
        Number.parseInt(hex.slice(2, 4), 16),
        Number.parseInt(hex.slice(4, 6), 16),
      ];
    }
  }
  // Default to white for unknown colour strings.
  return [255, 255, 255];
}

function isApproxEqual(
  data: Uint8Array | Uint8ClampedArray,
  i: number,
  [r, g, b]: [number, number, number],
): boolean {
  const delta = 4;
  const dr = Math.abs((data[i] ?? 0) - r);
  const dg = Math.abs((data[i + 1] ?? 0) - g);
  const db = Math.abs((data[i + 2] ?? 0) - b);
  return dr <= delta && dg <= delta && db <= delta;
}

function clearOverlap(primary: LabelBitmap, other: LabelBitmap): void {
  // Where `other` has a set bit, clear the same position in `primary`.
  // Black wins: the non-default (red, etc.) plane keeps its bit, default plane loses it.
  if (primary.widthPx !== other.widthPx || primary.heightPx !== other.heightPx) return;
  const bytes = primary.data.length;
  for (let i = 0; i < bytes; i++) {
    const otherByte = other.data[i] ?? 0;
    const primaryByte = primary.data[i];
    if (otherByte !== 0 && primaryByte !== undefined) {
      primary.data[i] = primaryByte & ~otherByte;
    }
  }
}
