import { describe, expect, it } from 'vitest';
import { LabelDesigner } from '../designer.js';
import { type GroupObject, type LabelObjectInput, type ShapeObject } from '../objects.js';

describe('group rendering', () => {
  it('renders children at group-relative coordinates', async () => {
    const d = new LabelDesigner({ canvas: { widthDots: 100, heightDots: 100 } });
    const child: ShapeObject = {
      id: 'c',
      type: 'shape',
      x: 5,
      y: 5,
      width: 20,
      height: 20,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      color: '#000',
      shape: 'rectangle',
      fill: true,
      strokeWidth: 0,
      invert: false,
    };
    const group: LabelObjectInput<GroupObject> = {
      type: 'group',
      x: 20,
      y: 20,
      width: 40,
      height: 40,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      color: '#000',
      children: [child],
    };
    d.add(group);
    const img = await d.render();
    expect(img.width).toBe(100);
  });
});
