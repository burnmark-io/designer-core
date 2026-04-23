import { describe, expect, it } from 'vitest';
import { parseCsv } from '../csv.js';

describe('parseCsv', () => {
  it('parses headers and rows from a string', async () => {
    const csv = 'name,city\nAlice,Amsterdam\nBob,Brussels';
    const result = await parseCsv(csv);
    expect(result.headers).toEqual(['name', 'city']);
    expect(result.rows).toEqual([
      { name: 'Alice', city: 'Amsterdam' },
      { name: 'Bob', city: 'Brussels' },
    ]);
    expect(result.rowCount).toBe(2);
  });

  it('handles quoted fields with commas', async () => {
    const csv = 'name,address\n"Jones, A","123, Main St"';
    const result = await parseCsv(csv);
    expect(result.rows[0]).toEqual({ name: 'Jones, A', address: '123, Main St' });
  });

  it('handles escaped quotes', async () => {
    const csv = 'name,quote\nAlice,"She said ""hi"""';
    const result = await parseCsv(csv);
    expect(result.rows[0]).toEqual({ name: 'Alice', quote: 'She said "hi"' });
  });

  it('skips empty rows', async () => {
    const csv = 'a,b\n1,2\n\n3,4\n';
    const result = await parseCsv(csv);
    expect(result.rowCount).toBe(2);
  });

  it('trims headers', async () => {
    const csv = ' name , city \nA,B';
    const result = await parseCsv(csv);
    expect(result.headers).toEqual(['name', 'city']);
    expect(result.rows[0]).toEqual({ name: 'A', city: 'B' });
  });

  it('accepts Uint8Array input', async () => {
    const bytes = new TextEncoder().encode('x,y\n1,2');
    const result = await parseCsv(bytes);
    expect(result.rows).toEqual([{ x: '1', y: '2' }]);
  });

  it('accepts Blob input', async () => {
    const blob = new Blob(['k,v\nfoo,bar'], { type: 'text/csv' });
    const result = await parseCsv(blob);
    expect(result.rows).toEqual([{ k: 'foo', v: 'bar' }]);
  });

  it('handles missing fields as empty strings', async () => {
    const csv = 'a,b,c\n1,2';
    const result = await parseCsv(csv);
    expect(result.rows[0]).toEqual({ a: '1', b: '2', c: '' });
  });

  it('returns empty data for an empty input', async () => {
    const result = await parseCsv('');
    expect(result.rowCount).toBe(0);
    expect(result.headers).toEqual([]);
  });
});
