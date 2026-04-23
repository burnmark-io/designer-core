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
    }
  });
});

describe('DefaultFontLoader', () => {
  it('warns and marks as loaded when a bundled family file is absent', async () => {
    const warnings: string[] = [];
    const loader = new DefaultFontLoader(family => {
      warnings.push(family);
    });
    await loader.load('Burnmark Sans');
    expect(loader.isLoaded('Burnmark Sans')).toBe(true);
    expect(warnings).toContain('Burnmark Sans');
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
    await loader.load('Burnmark Sans');
    await loader.load('Burnmark Sans');
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
