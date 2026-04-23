import { readFile, writeFile } from 'node:fs/promises';
import { fromJSON, parseCsv, type LabelDocument, type CsvData } from '@burnmark-io/designer-core';

export async function readLabelFile(path: string): Promise<LabelDocument> {
  const text = await readFile(path, 'utf-8');
  return fromJSON(text);
}

export async function readCsvFile(path: string): Promise<CsvData> {
  const text = await readFile(path, 'utf-8');
  return parseCsv(text);
}

export async function writeBlobFile(path: string, blob: Blob): Promise<void> {
  const buf = Buffer.from(await blob.arrayBuffer());
  await writeFile(path, buf);
}

/**
 * Parse `--var key=value` flags (repeatable) into a variables record.
 */
export function parseVarFlags(values?: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!values) return out;
  for (const raw of values) {
    const idx = raw.indexOf('=');
    if (idx < 1) continue;
    const key = raw.slice(0, idx).trim();
    const value = raw.slice(idx + 1);
    if (key) out[key] = value;
  }
  return out;
}

/**
 * Parse an index range like `1-50` or `1,3,7` into a Set of 1-based indices.
 */
export function parseRowRange(range?: string): Set<number> | undefined {
  if (!range) return undefined;
  const out = new Set<number>();
  for (const part of range.split(',')) {
    const trimmed = part.trim();
    if (trimmed === '') continue;
    const dashMatch = /^(\d+)-(\d+)$/.exec(trimmed);
    if (dashMatch) {
      const a = Number.parseInt(dashMatch[1] ?? '0', 10);
      const b = Number.parseInt(dashMatch[2] ?? '0', 10);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.add(i);
    } else {
      const n = Number.parseInt(trimmed, 10);
      if (!Number.isNaN(n)) out.add(n);
    }
  }
  return out.size > 0 ? out : undefined;
}

/** Filter rows by a 1-based index selection. */
export function filterRows<T>(rows: T[], selection?: Set<number>): T[] {
  if (!selection) return rows;
  return rows.filter((_row, idx) => selection.has(idx + 1));
}
