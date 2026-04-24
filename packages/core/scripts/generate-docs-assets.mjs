#!/usr/bin/env node
/**
 * Generate the PNG assets referenced from the docs.
 *
 * Produces:
 *   docs/assets/grey-dither-example.png       grey text -> Floyd-Steinberg stipple
 *   docs/assets/opacity-stipple-example.png   opacity 0.5 -> stipple pattern
 *   docs/assets/qr-barcode-example.png        a rendered QR code
 *
 * Run via `node packages/core/scripts/generate-docs-assets.mjs` from the repo root.
 * Requires `@burnmark-io/designer-core` to be built (`pnpm -F @burnmark-io/designer-core build`).
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { LabelDesigner, exportPng, toBitmap } from '../dist/index.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const assetsDir = resolve(repoRoot, 'docs', 'assets');
await mkdir(assetsDir, { recursive: true });

/**
 * Render a document to a 1bpp LabelBitmap (what a thermal printer actually
 * sees), then upscale the 1bpp pixels back to RGB pixels and write a PNG.
 * This is the "what the printer will emit" preview — dithered stipple and all.
 */
async function renderThermalPreviewPng(designer, outputPath, scale = 2) {
  const image = await designer.render();
  const bitmap = toBitmap(image, { threshold: 128, dither: true });
  const { widthPx, heightPx, data } = bitmap;

  const outWidth = widthPx * scale;
  const outHeight = heightPx * scale;
  const rgba = new Uint8ClampedArray(outWidth * outHeight * 4);
  const rowBytes = Math.ceil(widthPx / 8);

  for (let y = 0; y < heightPx; y++) {
    for (let x = 0; x < widthPx; x++) {
      const byteIndex = y * rowBytes + Math.trunc(x / 8);
      const bit = ((data[byteIndex] ?? 0) >> (7 - (x % 8))) & 1;
      const v = bit ? 0 : 255;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = x * scale + dx;
          const py = y * scale + dy;
          const i = (py * outWidth + px) * 4;
          rgba[i] = v;
          rgba[i + 1] = v;
          rgba[i + 2] = v;
          rgba[i + 3] = 255;
        }
      }
    }
  }

  const mod = await import('@napi-rs/canvas');
  const canvas = mod.createCanvas(outWidth, outHeight);
  const ctx = canvas.getContext('2d');
  const imgData = new mod.ImageData(rgba, outWidth, outHeight);
  ctx.putImageData(imgData, 0, 0);
  const png = canvas.toBuffer('image/png');
  await writeFile(outputPath, png);
  console.log(`Wrote ${outputPath} (${outWidth}×${outHeight})`);
}

async function greyDitherExample() {
  const designer = new LabelDesigner({
    canvas: { widthDots: 480, heightDots: 120, dpi: 300 },
  });
  designer.add({
    type: 'text',
    x: 20, y: 20, width: 440, height: 80,
    rotation: 0, opacity: 1, locked: false, visible: true,
    color: '#808080',
    content: 'GREY TEXT',
    fontFamily: 'Burnmark Sans',
    fontSize: 56, fontWeight: 'bold', fontStyle: 'normal',
    textAlign: 'center', verticalAlign: 'middle',
    letterSpacing: 0, lineHeight: 1.2,
    invert: false, wrap: false, autoHeight: false,
  });
  await renderThermalPreviewPng(designer, resolve(assetsDir, 'grey-dither-example.png'));
}

async function opacityStippleExample() {
  const designer = new LabelDesigner({
    canvas: { widthDots: 480, heightDots: 120, dpi: 300 },
  });
  designer.add({
    type: 'text',
    x: 20, y: 20, width: 440, height: 80,
    rotation: 0, opacity: 0.5, locked: false, visible: true,
    color: '#000000',
    content: 'OPACITY 0.5',
    fontFamily: 'Burnmark Sans',
    fontSize: 56, fontWeight: 'bold', fontStyle: 'normal',
    textAlign: 'center', verticalAlign: 'middle',
    letterSpacing: 0, lineHeight: 1.2,
    invert: false, wrap: false, autoHeight: false,
  });
  await renderThermalPreviewPng(designer, resolve(assetsDir, 'opacity-stipple-example.png'));
}

async function qrBarcodeExample() {
  const designer = new LabelDesigner({
    canvas: { widthDots: 400, heightDots: 400, dpi: 300 },
  });
  designer.add({
    type: 'barcode',
    x: 50, y: 50, width: 300, height: 300,
    rotation: 0, opacity: 1, locked: false, visible: true,
    color: '#000000',
    format: 'qrcode',
    data: 'https://burnmark-io.github.io/designer-core/',
    options: { eclevel: 'M' },
  });
  const blob = await exportPng(designer.document);
  const buf = Buffer.from(await blob.arrayBuffer());
  const outputPath = resolve(assetsDir, 'qr-barcode-example.png');
  await writeFile(outputPath, buf);
  console.log(`Wrote ${outputPath} (full-colour, ${buf.byteLength} bytes)`);
}

await greyDitherExample();
await opacityStippleExample();
await qrBarcodeExample();
