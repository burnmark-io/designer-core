import { describe, expect, it } from 'vitest';
import { fromJSON, toJSON } from '../serialisation.js';
import { createDocument } from '../document.js';

describe('serialisation', () => {
  it('toJSON emits pretty JSON', () => {
    const doc = createDocument('abc', { widthDots: 100 });
    const json = toJSON(doc);
    expect(json).toContain('\n');
    expect(json).toContain('"id": "abc"');
  });

  it('round-trip preserves all fields', () => {
    const doc = createDocument('rt', { widthDots: 123, heightDots: 456, dpi: 203 });
    const json = toJSON(doc);
    const parsed = fromJSON(json);
    expect(parsed.id).toBe('rt');
    expect(parsed.canvas.widthDots).toBe(123);
    expect(parsed.canvas.heightDots).toBe(456);
    expect(parsed.canvas.dpi).toBe(203);
  });

  it('fromJSON throws on invalid JSON', () => {
    expect(() => fromJSON('{not valid}')).toThrow(/Invalid .label JSON/);
  });
});
