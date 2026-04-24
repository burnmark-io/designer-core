import { describe, expect, it } from 'vitest';
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
