import { describe, expect, it } from 'vitest';
import { listSheetsCommand, listPrintersCommand } from '../commands/list.js';

describe('listSheetsCommand', () => {
  it('lists at least one built-in sheet', () => {
    const lines = listSheetsCommand();
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some(l => l.includes('avery-l7160'))).toBe(true);
  });
});

describe('listPrintersCommand', () => {
  it('returns a list (possibly empty-notice) without throwing', async () => {
    const lines = await listPrintersCommand();
    expect(lines.length).toBeGreaterThan(0);
  });
});
