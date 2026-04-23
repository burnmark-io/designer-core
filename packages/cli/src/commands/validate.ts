import {
  BarcodeEngine,
  extractPlaceholders,
  isBarcodeObject,
  LabelDesigner,
  validateVariables,
  walkObjects,
} from '@burnmark-io/designer-core';
import { filterRows, parseRowRange, parseVarFlags, readCsvFile, readLabelFile } from '../io.js';

export interface ValidateArgs {
  template: string;
  csv?: string;
  var?: string[];
  rows?: string;
}

export interface ValidationReport {
  template: string;
  placeholders: string[];
  csvRowCount: number;
  missingAcrossRows: Set<string>;
  unusedAcrossRows: Set<string>;
  barcodeFailures: { rowIndex: number; objectId: string; message: string }[];
  ok: boolean;
}

export async function validateCommand(args: ValidateArgs): Promise<ValidationReport> {
  const doc = await readLabelFile(args.template);
  const designer = new LabelDesigner();
  designer.loadDocument(doc);

  const placeholders = extractPlaceholders(doc);
  const staticVars = parseVarFlags(args.var);
  const csv = args.csv ? await readCsvFile(args.csv) : undefined;
  const selection = parseRowRange(args.rows);
  const rows = csv ? filterRows(csv.rows, selection) : [staticVars];

  const missingAcrossRows = new Set<string>();
  const unusedAcrossRows = new Set<string>();
  const barcodeFailures: ValidationReport['barcodeFailures'] = [];

  const engine = new BarcodeEngine();
  for (const [rowIndex, rawRow] of rows.entries()) {
    const merged = { ...staticVars, ...rawRow };
    const result = validateVariables(doc, merged);
    for (const m of result.missing) missingAcrossRows.add(m);
    for (const u of result.unused) unusedAcrossRows.add(u);

    for (const obj of walkObjects(doc.objects)) {
      if (!isBarcodeObject(obj)) continue;
      const data = applySimple(obj.data, merged);
      const bcResult = await engine.validate(obj.format, data, obj.options);
      if (!bcResult.valid) {
        barcodeFailures.push({
          rowIndex,
          objectId: obj.id,
          message: bcResult.errors?.[0] ?? 'unknown barcode validation error',
        });
      }
    }
  }

  return {
    template: args.template,
    placeholders,
    csvRowCount: rows.length,
    missingAcrossRows,
    unusedAcrossRows,
    barcodeFailures,
    ok: missingAcrossRows.size === 0 && barcodeFailures.length === 0,
  };
}

function applySimple(template: string, vars: Record<string, string>): string {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) lower[k.toLowerCase()] = v;
  return template.replaceAll(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key: string) => {
    return lower[key.trim().toLowerCase()] ?? match;
  });
}
