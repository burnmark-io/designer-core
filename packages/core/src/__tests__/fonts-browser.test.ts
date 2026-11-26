import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerFont } from '../fonts.js';

describe('browser font registration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds loaded faces to document.fonts in a page', async () => {
    const added: unknown[] = [];
    class FakeFontFace {
      constructor(
        public family: string,
        public source: unknown,
        public descriptors: unknown,
      ) {}
      load(): Promise<this> {
        return Promise.resolve(this);
      }
    }
    vi.stubGlobal('FontFace', FakeFontFace);
    vi.stubGlobal('document', { fonts: { add: (f: unknown) => added.push(f) } });
    await registerFont('Test Family', new Uint8Array([0, 1, 2]));
    expect(added.length).toBeGreaterThan(0);
    expect((added[0] as FakeFontFace).family).toBe('Test Family');
  });
});
