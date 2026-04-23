import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDocument, toJSON } from '@burnmark-io/designer-core';
import { renderCommand } from '../commands/render.js';

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'burnmark-cli-test-'));
  try {
    return await fn(dir);
  } finally {
    // left for the OS — tmpdir cleaned by CI
  }
}

function sampleDoc(): string {
  const doc = createDocument('s', { widthDots: 100, heightDots: 50, dpi: 300 });
  doc.objects.push({
    id: 'r',
    type: 'shape',
    x: 10,
    y: 10,
    width: 40,
    height: 30,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    color: '#000',
    shape: 'rectangle',
    fill: true,
    strokeWidth: 0,
    invert: false,
  });
  return toJSON(doc);
}

describe('renderCommand', () => {
  it('renders to PNG', async () => {
    await withTempDir(async dir => {
      const template = join(dir, 'label.label');
      const output = join(dir, 'out.png');
      await writeFile(template, sampleDoc(), 'utf-8');
      await renderCommand({ template, output });
      const bytes = await readFile(output);
      expect(bytes.byteLength).toBeGreaterThan(0);
      expect(bytes.subarray(0, 4).toString('hex')).toBe('89504e47'); // PNG signature
    });
  });

  it('renders to PDF', async () => {
    await withTempDir(async dir => {
      const template = join(dir, 'label.label');
      const output = join(dir, 'out.pdf');
      await writeFile(template, sampleDoc(), 'utf-8');
      await renderCommand({ template, output });
      const bytes = await readFile(output);
      expect(bytes.subarray(0, 4).toString()).toBe('%PDF');
    });
  });

  it('renders to sheet PDF', async () => {
    await withTempDir(async dir => {
      const template = join(dir, 'label.label');
      const output = join(dir, 'sheet.pdf');
      await writeFile(template, sampleDoc(), 'utf-8');
      await renderCommand({ template, output, sheet: 'avery-l7160' });
      const bytes = await readFile(output);
      expect(bytes.subarray(0, 4).toString()).toBe('%PDF');
    });
  });

  it('errors on unknown sheet code', async () => {
    await withTempDir(async dir => {
      const template = join(dir, 'label.label');
      await writeFile(template, sampleDoc(), 'utf-8');
      await expect(
        renderCommand({ template, output: join(dir, 'x.pdf'), sheet: 'does-not-exist' }),
      ).rejects.toThrow(/Unknown sheet code/);
    });
  });

  it('errors when --output missing', async () => {
    await withTempDir(async dir => {
      const template = join(dir, 'label.label');
      await writeFile(template, sampleDoc(), 'utf-8');
      await expect(renderCommand({ template })).rejects.toThrow(/--output/);
    });
  });
});
