import { describe, expect, it } from 'vitest';
import {
  applyTemplate,
  applyVariables,
  extractPlaceholders,
  validateVariables,
} from '../template.js';
import { createDocument } from '../document.js';
import { type LabelObject } from '../objects.js';

const text = (id: string, content: string): LabelObject => ({
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
  content,
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

const barcode = (id: string, data: string): LabelObject => ({
  id,
  type: 'barcode',
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  rotation: 0,
  opacity: 1,
  locked: false,
  visible: true,
  color: '#000',
  format: 'qrcode',
  data,
  options: {},
});

describe('applyTemplate', () => {
  it('substitutes a simple placeholder', () => {
    expect(applyTemplate('Hello {{name}}', { name: 'World' })).toBe('Hello World');
  });

  it('is case-insensitive on keys', () => {
    expect(applyTemplate('{{Name}}', { NAME: 'Mannes' })).toBe('Mannes');
    expect(applyTemplate('{{NAME}}', { name: 'Mannes' })).toBe('Mannes');
  });

  it('trims whitespace inside placeholder', () => {
    expect(applyTemplate('{{  name  }}', { name: 'Mannes' })).toBe('Mannes');
  });

  it('leaves unknown placeholders as-is', () => {
    expect(applyTemplate('{{missing}}', {})).toBe('{{missing}}');
  });

  it('handles multiple placeholders in one string', () => {
    expect(applyTemplate('{{a}} + {{b}} = {{c}}', { a: '1', b: '2', c: '3' })).toBe('1 + 2 = 3');
  });

  it('does not substitute nested placeholders (one pass only)', () => {
    expect(applyTemplate('{{a}}', { a: '{{b}}', b: 'final' })).toBe('{{b}}');
  });
});

describe('extractPlaceholders', () => {
  it('finds placeholders in text and barcode objects', () => {
    const doc = createDocument('d1');
    doc.objects.push(text('t', 'Hello {{name}}'));
    doc.objects.push(barcode('b', '{{order_id}}'));
    expect(extractPlaceholders(doc)).toEqual(['name', 'order_id']);
  });

  it('dedupes and lowercases', () => {
    const doc = createDocument('d1');
    doc.objects.push(text('t1', '{{Name}}'));
    doc.objects.push(text('t2', '{{name}} and {{NAME}}'));
    expect(extractPlaceholders(doc)).toEqual(['name']);
  });

  it('returns [] when no placeholders', () => {
    const doc = createDocument('d1');
    doc.objects.push(text('t', 'plain text'));
    expect(extractPlaceholders(doc)).toEqual([]);
  });
});

describe('validateVariables', () => {
  it('reports missing variables', () => {
    const doc = createDocument('d1');
    doc.objects.push(text('t', '{{name}} {{city}}'));
    const result = validateVariables(doc, { name: 'Mannes' });
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['city']);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('reports unused variables', () => {
    const doc = createDocument('d1');
    doc.objects.push(text('t', '{{name}}'));
    const result = validateVariables(doc, { name: 'Mannes', extra: 'x' });
    expect(result.valid).toBe(true);
    expect(result.unused).toEqual(['extra']);
  });

  it('is valid when all referenced variables are supplied', () => {
    const doc = createDocument('d1');
    doc.objects.push(text('t', '{{a}}'));
    doc.objects.push(barcode('b', '{{a}}'));
    expect(validateVariables(doc, { a: 'x' }).valid).toBe(true);
  });
});

describe('applyVariables', () => {
  it('returns a new document with substitutions', () => {
    const doc = createDocument('d1');
    doc.objects.push(text('t', 'Hi {{name}}'));
    doc.objects.push(barcode('b', '{{sku}}'));
    const result = applyVariables(doc, { name: 'Mannes', sku: 'ABC-123' });
    expect(result.objects[0]).toMatchObject({ content: 'Hi Mannes' });
    expect(result.objects[1]).toMatchObject({ data: 'ABC-123' });
    // original untouched
    expect(doc.objects[0]).toMatchObject({ content: 'Hi {{name}}' });
  });
});
