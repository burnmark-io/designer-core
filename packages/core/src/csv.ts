import Papa from 'papaparse';

export interface CsvData {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

export type CsvInput = string | Uint8Array | ArrayBuffer | Blob;

/**
 * Parse CSV content into headers and rows. Accepts plain strings, byte
 * buffers, or `Blob`/`File` objects. Uses Papaparse under the hood.
 *
 * - Trims header names.
 * - Skips fully empty rows.
 * - Quoted fields, escaped quotes, and configurable delimiters are handled
 *   by Papaparse.
 */
export async function parseCsv(input: CsvInput): Promise<CsvData> {
  const text = await normaliseToText(input);
  if (text.trim() === '') {
    return { headers: [], rows: [], rowCount: 0 };
  }
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: h => h.trim(),
    dynamicTyping: false,
  });

  // Papaparse "errors" are mostly informational: delimiter auto-detection
  // notices (benign — it defaults to ','), FieldMismatch on ragged rows
  // (fills/trims). Only propagate Quotes errors, which usually indicate a
  // malformed file.
  for (const err of parsed.errors) {
    if (err.type === 'Quotes') {
      throw new Error(`CSV parse error: ${err.message}`);
    }
  }

  const headers = parsed.meta.fields?.map(f => f.trim()) ?? [];
  const rows: Record<string, string>[] = parsed.data
    .map(row => normaliseRow(row, headers))
    .filter(row => Object.values(row).some(v => v !== ''));

  return {
    headers,
    rows,
    rowCount: rows.length,
  };
}

async function normaliseToText(input: CsvInput): Promise<string> {
  if (typeof input === 'string') return input;
  if (input instanceof Uint8Array) return new TextDecoder('utf-8').decode(input);
  if (input instanceof ArrayBuffer) return new TextDecoder('utf-8').decode(input);
  if (typeof Blob !== 'undefined' && input instanceof Blob) return input.text();
  throw new TypeError('parseCsv: unsupported input type');
}

function normaliseRow(row: Record<string, unknown>, headers: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of headers) {
    out[key] = stringifyCell(row[key]);
  }
  return out;
}

function stringifyCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') {
    return String(v);
  }
  return '';
}
