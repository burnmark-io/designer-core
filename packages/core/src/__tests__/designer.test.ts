import { describe, expect, it } from 'vitest';
import { LabelDesigner } from '../designer.js';
import { type LabelObjectInput, type TextObject } from '../objects.js';

type TextInput = LabelObjectInput<TextObject>;

const textInput = (overrides: Partial<TextInput> = {}): TextInput => ({
  type: 'text',
  x: 0,
  y: 0,
  width: 100,
  height: 40,
  rotation: 0,
  opacity: 1,
  locked: false,
  visible: true,
  color: '#000000',
  content: 'Hello',
  fontFamily: 'Burnmark Sans',
  fontSize: 20,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'left',
  verticalAlign: 'top',
  letterSpacing: 0,
  lineHeight: 1.2,
  invert: false,
  wrap: false,
  autoHeight: false,
  ...overrides,
});

describe('LabelDesigner', () => {
  it('creates a document with defaults', () => {
    const d = new LabelDesigner();
    expect(d.document.canvas.widthDots).toBe(696);
    expect(d.document.canvas.dpi).toBe(300);
    expect(d.document.objects).toHaveLength(0);
    expect(d.document.version).toBe(1);
    expect(d.document.id).toMatch(/[\da-f-]+/);
  });

  it('accepts custom canvas options', () => {
    const d = new LabelDesigner({
      canvas: { widthDots: 400, heightDots: 200, dpi: 203 },
      name: 'My Label',
    });
    expect(d.document.canvas.widthDots).toBe(400);
    expect(d.document.canvas.heightDots).toBe(200);
    expect(d.document.canvas.dpi).toBe(203);
    expect(d.document.name).toBe('My Label');
  });

  it('add / update / remove / get objects', () => {
    const d = new LabelDesigner();
    const id = d.add(textInput());
    expect(d.document.objects).toHaveLength(1);

    d.update(id, { x: 50 });
    const obj = d.get(id);
    expect(obj?.x).toBe(50);

    d.remove(id);
    expect(d.document.objects).toHaveLength(0);
    expect(d.get(id)).toBeUndefined();
  });

  it('update cannot change an object type (discriminator preserved)', () => {
    const d = new LabelDesigner();
    const id = d.add(textInput());
    // attempt to change type through update
    d.update(id, { type: 'shape' } as unknown as Partial<{ type: 'text' }>);
    expect(d.get(id)?.type).toBe('text');
  });

  it('z-order: reorder up / down / top / bottom', () => {
    const d = new LabelDesigner();
    const a = d.add(textInput({ content: 'A' }));
    const b = d.add(textInput({ content: 'B' }));
    const c = d.add(textInput({ content: 'C' }));

    // initial order: [A, B, C] — C is on top (end of array = drawn last)
    expect(d.document.objects.map(o => o.id)).toEqual([a, b, c]);

    d.reorder(a, 'top');
    expect(d.document.objects.map(o => o.id)).toEqual([b, c, a]);

    d.reorder(a, 'bottom');
    expect(d.document.objects.map(o => o.id)).toEqual([a, b, c]);

    d.reorder(a, 'up');
    expect(d.document.objects.map(o => o.id)).toEqual([b, a, c]);

    d.reorder(a, 'down');
    expect(d.document.objects.map(o => o.id)).toEqual([a, b, c]);
  });

  it('undo / redo', () => {
    const d = new LabelDesigner();
    const id = d.add(textInput({ content: 'A' }));
    expect(d.canUndo).toBe(true);
    expect(d.canRedo).toBe(false);

    d.undo();
    expect(d.document.objects).toHaveLength(0);
    expect(d.canRedo).toBe(true);

    d.redo();
    expect(d.document.objects).toHaveLength(1);
    expect(d.get(id)?.id).toBe(id);
  });

  it('redo stack cleared after a fresh mutation', () => {
    const d = new LabelDesigner();
    d.add(textInput({ content: 'A' }));
    d.add(textInput({ content: 'B' }));
    d.undo();
    expect(d.canRedo).toBe(true);

    // fresh mutation should drop the redo tail
    d.add(textInput({ content: 'C' }));
    expect(d.canRedo).toBe(false);
  });

  it('setCanvas merges', () => {
    const d = new LabelDesigner();
    d.setCanvas({ widthDots: 100 });
    expect(d.document.canvas.widthDots).toBe(100);
    expect(d.document.canvas.dpi).toBe(300); // unchanged
  });

  it('createDocument defaults orientation to "vertical"', () => {
    const d = new LabelDesigner();
    expect(d.document.canvas.orientation).toBe('vertical');
  });

  it('setCanvas preserves orientation when not patched', () => {
    const d = new LabelDesigner({ canvas: { orientation: 'horizontal' } });
    d.setCanvas({ widthDots: 100 });
    expect(d.document.canvas.orientation).toBe('horizontal');
  });

  it('setCanvas accepts orientation patches', () => {
    const d = new LabelDesigner();
    d.setCanvas({ orientation: 'horizontal' });
    expect(d.document.canvas.orientation).toBe('horizontal');
  });

  it('toJSON → fromJSON round-trip', () => {
    const d = new LabelDesigner({ name: 'Round Trip' });
    d.add(textInput({ content: 'Hello' }));
    d.add(textInput({ content: 'World', color: '#ff0000' }));

    const json = d.toJSON();

    const d2 = new LabelDesigner();
    d2.fromJSON(json);

    expect(d2.document.name).toBe('Round Trip');
    expect(d2.document.objects).toHaveLength(2);
    expect(d2.document.objects[0]?.type).toBe('text');
    expect(d2.document.objects[1]?.color).toBe('#ff0000');
  });

  it('emits change and historyChange events on mutation', () => {
    const d = new LabelDesigner();
    let changes = 0;
    let historyChanges = 0;
    d.on('change', () => {
      changes += 1;
    });
    d.on('historyChange', () => {
      historyChanges += 1;
    });
    d.add(textInput());
    expect(changes).toBe(1);
    expect(historyChanges).toBe(1);
    d.undo();
    expect(changes).toBe(2);
  });

  it('off removes an event handler', () => {
    const d = new LabelDesigner();
    let changes = 0;
    const handler = (): void => {
      changes += 1;
    };
    d.on('change', handler);
    d.add(textInput());
    d.off('change', handler);
    d.add(textInput());
    expect(changes).toBe(1);
  });

  it('loadDocument replaces state and clears history', () => {
    const d = new LabelDesigner();
    d.add(textInput());
    const snapshot = structuredClone(d.document);
    d.add(textInput());
    d.loadDocument(snapshot);
    expect(d.document.objects).toHaveLength(1);
    expect(d.canUndo).toBe(false);
  });

  it('newDocument resets everything', () => {
    const d = new LabelDesigner();
    d.add(textInput());
    d.newDocument({ widthDots: 200 });
    expect(d.document.objects).toHaveLength(0);
    expect(d.document.canvas.widthDots).toBe(200);
    expect(d.canUndo).toBe(false);
  });

  it('getAll returns a copy', () => {
    const d = new LabelDesigner();
    d.add(textInput());
    const list = d.getAll();
    list.length = 0;
    expect(d.document.objects).toHaveLength(1);
  });
});
