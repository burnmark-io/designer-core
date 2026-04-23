import { describe, expect, it } from 'vitest';
import { BarcodeEngine } from '../render/barcode.js';
import { LabelDesigner } from '../designer.js';
import { type BarcodeObject, type LabelObjectInput } from '../objects.js';

const barcode = (overrides: Partial<BarcodeObject> = {}): LabelObjectInput<BarcodeObject> => ({
  type: 'barcode',
  x: 10,
  y: 10,
  width: 100,
  height: 50,
  rotation: 0,
  opacity: 1,
  locked: false,
  visible: true,
  color: '#000000',
  format: 'code128',
  data: '1234567890',
  options: {},
  ...overrides,
});

describe('BarcodeEngine', () => {
  it('renders a Code 128 barcode', async () => {
    const engine = new BarcodeEngine();
    const result = await engine.renderToImage('code128', '1234567890', {});
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it('renders a QR code', async () => {
    const engine = new BarcodeEngine();
    const result = await engine.renderToImage('qrcode', 'https://example.com', {
      eclevel: 'M',
    });
    expect(result.width).toBeGreaterThan(0);
  });

  it('validates valid barcode data', async () => {
    const engine = new BarcodeEngine();
    const r = await engine.validate('code128', 'ABC123', {});
    expect(r.valid).toBe(true);
  });

  it('validates invalid barcode data — EAN-13 wrong length', async () => {
    const engine = new BarcodeEngine();
    const r = await engine.validate('ean13', '123', {});
    expect(r.valid).toBe(false);
    expect(r.errors?.length).toBeGreaterThan(0);
  });

  it('renders through the designer end-to-end', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 100 } });
    d.add(barcode());
    const bm = await d.renderToBitmap();
    expect(bm.widthPx).toBe(200);
    expect(bm.heightPx).toBe(100);
  });

  it('invisible barcode does not draw', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 200, heightDots: 100 } });
    d.add(barcode({ visible: false }));
    const img = await d.render();
    expect(img.width).toBe(200);
  });
});
