import {
  LabelDesigner,
  renderBatch,
  SINGLE_COLOR,
  type PrintOptions,
} from '@burnmark-io/designer-core';
import { filterRows, parseRowRange, parseVarFlags, readCsvFile, readLabelFile } from '../io.js';
import { openPrinter } from '../drivers.js';

export interface PrintArgs {
  template: string;
  printer: string;
  csv?: string;
  var?: string[];
  rows?: string;
  density?: 'light' | 'normal' | 'dark';
  delay?: number;
  dryRun?: boolean;
}

export async function printCommand(args: PrintArgs): Promise<{ sent: number }> {
  const doc = await readLabelFile(args.template);
  const designer = new LabelDesigner();
  designer.loadDocument(doc);

  const staticVars = parseVarFlags(args.var);
  const csv = args.csv ? await readCsvFile(args.csv) : undefined;
  const selection = parseRowRange(args.rows);
  const rows = csv ? filterRows(csv.rows, selection) : [staticVars];

  const delay = args.delay ?? 500;

  if (args.dryRun) {
    // Render each row without opening a printer.
    let count = 0;
    for await (const r of renderBatch(designer, rows, SINGLE_COLOR)) {
      if (r.planes.size > 0) count += 1;
    }
    return { sent: count };
  }

  const adapter = await openPrinter(args.printer);
  await adapter.connect();

  const printOpts: PrintOptions = {};
  if (args.density !== undefined) printOpts.density = args.density;

  let sent = 0;
  try {
    for await (const result of renderBatch(designer, rows, adapter.capabilities)) {
      await adapter.print(result.planes, printOpts);
      sent += 1;
      if (sent < rows.length && delay > 0) {
        await sleep(delay);
      }
    }
  } finally {
    await adapter.disconnect();
  }
  return { sent };
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
