import { describe, expect, it } from 'vitest';
import { filterRows, parseRowRange, parseVarFlags } from '../io.js';

describe('parseVarFlags', () => {
  it('parses key=value pairs', () => {
    expect(parseVarFlags(['name=Mannes', 'city=Amsterdam'])).toEqual({
      name: 'Mannes',
      city: 'Amsterdam',
    });
  });

  it('supports values containing =', () => {
    expect(parseVarFlags(['url=https://example.com?x=1'])).toEqual({
      url: 'https://example.com?x=1',
    });
  });

  it('ignores malformed entries', () => {
    expect(parseVarFlags(['noequals', '=leadingEquals', 'good=1'])).toEqual({ good: '1' });
  });

  it('returns empty for undefined input', () => {
    expect(parseVarFlags()).toEqual({});
  });
});

describe('parseRowRange', () => {
  it('parses a single number', () => {
    expect(parseRowRange('3')).toEqual(new Set([3]));
  });

  it('parses a range', () => {
    expect(parseRowRange('1-5')).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('parses comma-separated values', () => {
    expect(parseRowRange('1,3,5')).toEqual(new Set([1, 3, 5]));
  });

  it('mixes ranges and singles', () => {
    expect(parseRowRange('1-3,7,9-10')).toEqual(new Set([1, 2, 3, 7, 9, 10]));
  });

  it('returns undefined for empty input', () => {
    expect(parseRowRange()).toBeUndefined();
    expect(parseRowRange('')).toBeUndefined();
  });
});

describe('filterRows', () => {
  const rows = [{ n: 'a' }, { n: 'b' }, { n: 'c' }, { n: 'd' }];

  it('returns all rows when no selection', () => {
    expect(filterRows(rows)).toEqual(rows);
  });

  it('filters by 1-based indices', () => {
    expect(filterRows(rows, new Set([1, 3]))).toEqual([{ n: 'a' }, { n: 'c' }]);
  });
});
