import { describe, expect, it } from 'vitest';
import {
  matchColourToPlane,
  partitionByPlane,
  SINGLE_COLOR,
  TWO_COLOR_BLACK_RED,
} from '../render/colour.js';
import { type LabelObject } from '../objects.js';

const base = (id: string, color: string): LabelObject => ({
  id,
  type: 'shape',
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  rotation: 0,
  opacity: 1,
  locked: false,
  visible: true,
  color,
  shape: 'rectangle',
  fill: true,
  strokeWidth: 0,
  invert: false,
});

describe('matchColourToPlane', () => {
  it('wildcard-only capability maps everything to the single plane', () => {
    expect(matchColourToPlane('#000000', SINGLE_COLOR)).toBe('black');
    expect(matchColourToPlane('#ff0000', SINGLE_COLOR)).toBe('black');
    expect(matchColourToPlane('red', SINGLE_COLOR)).toBe('black');
  });

  it('two-colour: explicit red matches the red plane', () => {
    expect(matchColourToPlane('#ff0000', TWO_COLOR_BLACK_RED)).toBe('red');
    expect(matchColourToPlane('red', TWO_COLOR_BLACK_RED)).toBe('red');
    expect(matchColourToPlane('darkred', TWO_COLOR_BLACK_RED)).toBe('red');
  });

  it('two-colour: unknown colours fall through to the wildcard plane', () => {
    expect(matchColourToPlane('#00ff00', TWO_COLOR_BLACK_RED)).toBe('black');
    expect(matchColourToPlane('#808080', TWO_COLOR_BLACK_RED)).toBe('black');
    expect(matchColourToPlane('orange', TWO_COLOR_BLACK_RED)).toBe('black');
  });

  it('matching is case-insensitive', () => {
    expect(matchColourToPlane('#FF0000', TWO_COLOR_BLACK_RED)).toBe('red');
    expect(matchColourToPlane('#Ff0000', TWO_COLOR_BLACK_RED)).toBe('red');
  });
});

describe('partitionByPlane', () => {
  it('splits objects across planes preserving order', () => {
    const a = base('a', '#000000');
    const b = base('b', '#ff0000');
    const c = base('c', '#000000');
    const d = base('d', '#ff0000');
    const map = partitionByPlane([a, b, c, d], TWO_COLOR_BLACK_RED);
    expect(map.get('black')?.map(o => o.id)).toEqual(['a', 'c']);
    expect(map.get('red')?.map(o => o.id)).toEqual(['b', 'd']);
  });

  it('returns one bucket for single-colour', () => {
    const map = partitionByPlane([base('a', 'red'), base('b', 'blue')], SINGLE_COLOR);
    expect(map.size).toBe(1);
    expect(map.get('black')?.map(o => o.id)).toEqual(['a', 'b']);
  });
});
