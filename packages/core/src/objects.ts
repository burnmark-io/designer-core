import { type BarcodeFormat, type BarcodeOptions } from './types.js';

export interface BaseObject {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  name?: string;
  color: string;
}

export interface TextObject extends BaseObject {
  type: 'text';
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  letterSpacing: number;
  lineHeight: number;
  invert: boolean;
  wrap: boolean;
  autoHeight: boolean;
}

export interface ImageObject extends BaseObject {
  type: 'image';
  assetKey: string;
  fit: 'contain' | 'cover' | 'fill' | 'none';
  threshold: number;
  dither: boolean;
  invert: boolean;
}

export interface BarcodeObject extends BaseObject {
  type: 'barcode';
  format: BarcodeFormat;
  data: string;
  options: BarcodeOptions;
}

export interface ShapeObject extends BaseObject {
  type: 'shape';
  shape: 'rectangle' | 'ellipse' | 'line';
  fill: boolean;
  strokeWidth: number;
  invert: boolean;
  cornerRadius?: number;
  lineDirection?: 'horizontal' | 'vertical' | 'diagonal-ltr' | 'diagonal-rtl';
}

export interface GroupObject extends BaseObject {
  type: 'group';
  children: LabelObject[];
}

export type LabelObject = TextObject | ImageObject | BarcodeObject | ShapeObject | GroupObject;

export type LabelObjectInput<T extends LabelObject = LabelObject> = Omit<T, 'id'>;

export function isTextObject(o: LabelObject): o is TextObject {
  return o.type === 'text';
}

export function isImageObject(o: LabelObject): o is ImageObject {
  return o.type === 'image';
}

export function isBarcodeObject(o: LabelObject): o is BarcodeObject {
  return o.type === 'barcode';
}

export function isShapeObject(o: LabelObject): o is ShapeObject {
  return o.type === 'shape';
}

export function isGroupObject(o: LabelObject): o is GroupObject {
  return o.type === 'group';
}

/**
 * Walk a document's objects recursively (descending into groups).
 * Yields every object exactly once, including the group itself.
 */
export function* walkObjects(objects: LabelObject[]): Generator<LabelObject> {
  for (const o of objects) {
    yield o;
    if (isGroupObject(o)) {
      yield* walkObjects(o.children);
    }
  }
}
