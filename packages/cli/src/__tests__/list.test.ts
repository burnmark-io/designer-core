import { describe, expect, it } from 'vitest';
import { listSheetsCommand, listPrintersCommand, resolveSheet } from '../commands/list.js';

describe('listSheetsCommand', () => {
  it('lists built-in sheets and a pointer to sheet-templates by default', () => {
    const lines = listSheetsCommand();
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some(l => l.includes('avery-l7160'))).toBe(true);
    expect(lines.some(l => l.includes('@burnmark-io/sheet-templates'))).toBe(true);
  });

  it('filters by brand', () => {
    const lines = listSheetsCommand({ brand: 'Herma' });
    expect(lines.some(l => l.toLowerCase().includes('herma'))).toBe(true);
    expect(lines.some(l => l.includes('avery-l7160'))).toBe(false);
  });

  it('filters by paper size', () => {
    const lines = listSheetsCommand({ paper: 'Letter', all: true });
    for (const line of lines) {
      if (line.trim() === '' || line.startsWith('(')) continue;
      expect(line).toMatch(/ Letter /);
    }
  });

  it('reports no matches when a filter has no hits', () => {
    const lines = listSheetsCommand({ brand: 'no-such-brand-xyzzy' });
    expect(lines.some(l => l.toLowerCase().includes('no sheets matched'))).toBe(true);
  });
});

describe('resolveSheet', () => {
  it('finds a built-in code', () => {
    const sheet = resolveSheet('avery-l7160');
    expect(sheet).toBeDefined();
    expect(sheet?.layouts.length).toBeGreaterThan(0);
  });

  it('returns undefined for unknown codes', () => {
    expect(resolveSheet('does-not-exist-xyzzy')).toBeUndefined();
  });
});

describe('listPrintersCommand', () => {
  it('returns a list (possibly empty-notice) without throwing', async () => {
    const lines = await listPrintersCommand();
    expect(lines.length).toBeGreaterThan(0);
  });
});
