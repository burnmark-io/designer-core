import { describe, expect, it } from 'vitest';
import {
  isBarcodeObject,
  isGroupObject,
  isImageObject,
  isShapeObject,
  isTextObject,
  walkObjects,
  type LabelObject,
} from '../objects.js';

const text = (id: string): LabelObject => ({
  id,
  type: 'text',
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  rotation: 0,
  opacity: 1,
  locked: false,
  visible: true,
  color: '#000',
  content: id,
  fontFamily: 'Burnmark Sans',
  fontSize: 10,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'left',
  verticalAlign: 'top',
  letterSpacing: 0,
  lineHeight: 1,
  invert: false,
  wrap: false,
  autoHeight: false,
});

describe('object type guards', () => {
  it('identifies each object type', () => {
    const t = text('a');
    expect(isTextObject(t)).toBe(true);
    expect(isImageObject(t)).toBe(false);
    expect(isBarcodeObject(t)).toBe(false);
    expect(isShapeObject(t)).toBe(false);
    expect(isGroupObject(t)).toBe(false);
  });
});

describe('walkObjects', () => {
  it('yields flat objects in order', () => {
    const a = text('a');
    const b = text('b');
    const ids = [...walkObjects([a, b])].map(o => o.id);
    expect(ids).toEqual(['a', 'b']);
  });

  it('descends into groups', () => {
    const a = text('a');
    const b = text('b');
    const group: LabelObject = {
      id: 'g',
      type: 'group',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      color: '#000',
      children: [a, b],
    };
    const ids = [...walkObjects([group])].map(o => o.id);
    expect(ids).toEqual(['g', 'a', 'b']);
  });
});
