import { extname } from 'node:path';
import { exportPdf, exportPng, exportSheet, LabelDesigner } from '@burnmark-io/designer-core';
import { resolveSheet } from './list.js';
import {
  filterRows,
  parseRowRange,
  parseVarFlags,
  readCsvFile,
  readLabelFile,
  writeBlobFile,
} from '../io.js';

export interface RenderArgs {
  template: string;
  output?: string;
  csv?: string;
  var?: string[];
  sheet?: string;
  rows?: string;
}

export async function renderCommand(args: RenderArgs): Promise<void> {
  const doc = await readLabelFile(args.template);
  const designer = new LabelDesigner();
  designer.loadDocument(doc);

  const vars = parseVarFlags(args.var);
  const csvRows = args.csv
    ? filterRows((await readCsvFile(args.csv)).rows, parseRowRange(args.rows))
    : undefined;

  if (!args.output) {
    throw new Error('render: --output <path> is required');
  }

  const output = args.output;
  const ext = extname(output).toLowerCase();

  if (args.sheet) {
    const sheet = resolveSheet(args.sheet);
    if (!sheet) {
      throw new Error(
        `Unknown sheet code: ${args.sheet}. Run \`burnmark list-sheets --brand <name>\` to find it.`,
      );
    }
    const blob = await exportSheet(designer.document, sheet, csvRows);
    await writeBlobFile(output, blob);
    return;
  }

  if (ext === '.pdf') {
    const blob = await exportPdf(designer.document, csvRows);
    await writeBlobFile(output, blob);
    return;
  }

  if (ext === '.png') {
    if (csvRows && csvRows.length > 1) {
      throw new Error('render: PNG output supports only a single label. Use PDF for batch.');
    }
    const rowVars = { ...vars, ...(csvRows?.[0] ?? {}) };
    const blob = await exportPng(designer.document, { variables: rowVars });
    await writeBlobFile(output, blob);
    return;
  }

  throw new Error(`render: unsupported output extension "${ext}". Use .png or .pdf.`);
}
