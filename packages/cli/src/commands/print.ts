import { LabelDesigner, renderBatch } from '@burnmark-io/designer-core';
import { type PrintOptions } from '@thermal-label/contracts';
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
    for await (const r of renderBatch(designer, rows)) {
      if (r.image.width > 0 && r.image.height > 0) count += 1;
    }
    return { sent: count };
  }

  const adapter = await openPrinter(args.printer);

  const printOpts: PrintOptions = {};
  if (args.density !== undefined) printOpts.density = args.density;

  // Query status once so the driver can use detected media for subsequent
  // print() calls without an explicit MediaDescriptor.
  await adapter.getStatus();

  let sent = 0;
  try {
    for await (const result of renderBatch(designer, rows)) {
      const { width, height, data } = result.image;
      const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
      await adapter.print({ width, height, data: bytes }, undefined, printOpts);
      sent += 1;
      if (sent < rows.length && delay > 0) {
        await sleep(delay);
      }
    }
  } finally {
    await adapter.close();
  }
  return { sent };
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
