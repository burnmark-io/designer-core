import { describe, expect, it, vi } from 'vitest';
import { BUNDLED_FONTS, DefaultFontLoader } from '../fonts.js';

describe('BUNDLED_FONTS', () => {
  it('declares the four Burnmark families', () => {
    expect(Object.keys(BUNDLED_FONTS)).toEqual([
      'Burnmark Sans',
      'Burnmark Mono',
      'Burnmark Serif',
      'Burnmark Narrow',
    ]);
    for (const entry of Object.values(BUNDLED_FONTS)) {
      expect(entry.license).toBe('OFL');
      expect(entry.actualFont.length).toBeGreaterThan(0);
      expect(entry.files.regular).toMatch(/\.woff2$/);
      expect(entry.files.bold).toMatch(/\.woff2$/);
    }
  });
});

describe('DefaultFontLoader', () => {
  it('loads a bundled family from disk without warning', async () => {
    const warnings: string[] = [];
    const loader = new DefaultFontLoader(family => {
      warnings.push(family);
    });
    await loader.load('Burnmark Sans');
    expect(loader.isLoaded('Burnmark Sans')).toBe(true);
    expect(warnings).toEqual([]);
  });

  it('loads bundled browser fonts from explicit font file URLs', async () => {
    const globalWithFonts = globalThis as typeof globalThis & {
      FontFace?: typeof FontFace;
      fonts?: { add: (font: FontFace) => void };
    };
    const hadFontFace = 'FontFace' in globalWithFonts;
    const originalFontFace = globalWithFonts.FontFace;
    const hadFonts = 'fonts' in globalWithFonts;
    const originalFonts = globalWithFonts.fonts;
    const sources: string[] = [];

    class MockFontFace {
      constructor(_family: string, source: string) {
        sources.push(source);
      }

      load(): Promise<FontFace> {
        return Promise.resolve(this as unknown as FontFace);
      }
    }

    Object.defineProperty(globalWithFonts, 'FontFace', {
      configurable: true,
      value: MockFontFace,
    });
    Object.defineProperty(globalWithFonts, 'fonts', {
      configurable: true,
      value: { add: vi.fn() },
    });

    try {
      const loader = new DefaultFontLoader();
      await loader.load('Burnmark Sans');

      expect(sources).toHaveLength(2);
      expect(sources).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/burnmark-sans\.woff2/),
          expect.stringMatching(/burnmark-sans-bold\.woff2/),
        ]),
      );
      expect(sources.every(source => !source.endsWith('/fonts/bundled/'))).toBe(true);
    } finally {
      if (hadFontFace) {
        Object.defineProperty(globalWithFonts, 'FontFace', {
          configurable: true,
          value: originalFontFace,
        });
      } else {
        Reflect.deleteProperty(globalWithFonts, 'FontFace');
      }

      if (hadFonts) {
        Object.defineProperty(globalWithFonts, 'fonts', {
          configurable: true,
          value: originalFonts,
        });
      } else {
        Reflect.deleteProperty(globalWithFonts, 'fonts');
      }
    }
  });

  it('warns and marks as loaded for unknown system fonts', async () => {
    const warnings: string[] = [];
    const loader = new DefaultFontLoader(family => {
      warnings.push(family);
    });
    await loader.load('Definitely-Not-A-Real-Font');
    expect(loader.isLoaded('Definitely-Not-A-Real-Font')).toBe(true);
    expect(warnings).toContain('Definitely-Not-A-Real-Font');
  });

  it('skips the load call if family is already loaded', async () => {
    let warnings = 0;
    const loader = new DefaultFontLoader(() => {
      warnings += 1;
    });
    // Use an unknown system font — hitting `load()` twice on a *bundled*
    // family shouldn't warn at all now, so we need a path that does.
    await loader.load('Definitely-Not-A-Real-Font');
    await loader.load('Definitely-Not-A-Real-Font');
    expect(warnings).toBe(1);
  });

  it('listLoaded returns loaded descriptors', async () => {
    const loader = new DefaultFontLoader();
    await loader.load('Burnmark Mono');
    await loader.load('Helvetica');
    const list = loader.listLoaded();
    expect(list.map(d => d.family)).toContain('Burnmark Mono');
    expect(list.map(d => d.family)).toContain('Helvetica');
    expect(list.find(d => d.family === 'Burnmark Mono')?.source).toBe('bundled');
    expect(list.find(d => d.family === 'Helvetica')?.source).toBe('system');
  });
});
