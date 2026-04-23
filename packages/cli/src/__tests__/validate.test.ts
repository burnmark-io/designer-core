import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDocument, toJSON } from '@burnmark-io/designer-core';
import { validateCommand } from '../commands/validate.js';

function docWithPlaceholder(): string {
  const doc = createDocument('v', { widthDots: 200, heightDots: 50, dpi: 300 });
  doc.objects.push({
    id: 't',
    type: 'text',
    x: 0,
    y: 0,
    width: 200,
    height: 40,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    color: '#000',
    content: 'Hello {{name}}',
    fontFamily: 'sans-serif',
    fontSize: 18,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    verticalAlign: 'top',
    letterSpacing: 0,
    lineHeight: 1.2,
    invert: false,
    wrap: false,
    autoHeight: false,
  });
  return toJSON(doc);
}

describe('validateCommand', () => {
  it('reports missing variables when no CSV is supplied', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'burnmark-v-'));
    const template = join(dir, 'l.label');
    await writeFile(template, docWithPlaceholder(), 'utf-8');
    const report = await validateCommand({ template });
    expect(report.placeholders).toEqual(['name']);
    expect(report.missingAcrossRows).toEqual(new Set(['name']));
    expect(report.ok).toBe(false);
  });

  it('passes with a satisfied CSV', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'burnmark-v-'));
    const template = join(dir, 'l.label');
    const csvPath = join(dir, 'r.csv');
    await writeFile(template, docWithPlaceholder(), 'utf-8');
    await writeFile(csvPath, 'name\nMannes\nAlice\n', 'utf-8');
    const report = await validateCommand({ template, csv: csvPath });
    expect(report.csvRowCount).toBe(2);
    expect(report.missingAcrossRows.size).toBe(0);
    expect(report.ok).toBe(true);
  });
});
