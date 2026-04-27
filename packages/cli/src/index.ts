/* eslint-disable no-console */
import { Command } from 'commander';
import chalk from 'chalk';
import { renderCommand, type RenderArgs } from './commands/render.js';
import { validateCommand, type ValidateArgs } from './commands/validate.js';
import { printCommand, type PrintArgs } from './commands/print.js';
import { listPrintersCommand, listSheetsCommand, type ListSheetsArgs } from './commands/list.js';

export async function run(argv: string[]): Promise<void> {
  const program = new Command();
  program
    .name('burnmark')
    .description('Headless label design CLI — render, print, validate, CSV batch')
    .version('0.0.0');

  program
    .command('render')
    .description('Render a .label file to PNG or PDF')
    .requiredOption('--template <path>', '.label file')
    .option('--output <path>', 'output PNG or PDF file')
    .option('--csv <path>', 'CSV for batch mode')
    .option('--var <kv...>', 'single variable, key=value (repeatable)')
    .option('--sheet <code>', 'sheet template code for sticker sheet export')
    .option('--rows <range>', 'e.g. 1-50 or 1,3,7 for partial batch')
    .option('--no-rotate', 'ignore canvas.orientation; export at canonical dimensions')
    .action(async (opts: RenderArgs) => {
      await renderCommand(opts);
      console.log(chalk.green(`✓ Rendered to ${String(opts.output)}`));
    });

  program
    .command('validate')
    .description('Check variables and barcode data against a template + CSV')
    .requiredOption('--template <path>', '.label file')
    .option('--csv <path>', 'CSV file')
    .option('--var <kv...>', 'single variable, key=value (repeatable)')
    .option('--rows <range>', 'e.g. 1-50 or 1,3,7 for partial batch')
    .action(async (opts: ValidateArgs) => {
      const report = await validateCommand(opts);
      console.log(chalk.bold(`Template: ${report.template}`));
      console.log(
        `  Placeholders referenced: ${report.placeholders.length === 0 ? '(none)' : report.placeholders.join(', ')}`,
      );
      console.log(`  CSV rows checked:        ${String(report.csvRowCount)}`);
      if (report.missingAcrossRows.size > 0) {
        console.log(
          chalk.red(`  Missing variables:       ${[...report.missingAcrossRows].join(', ')}`),
        );
      }
      if (report.unusedAcrossRows.size > 0) {
        console.log(
          chalk.yellow(`  Unused variables:        ${[...report.unusedAcrossRows].join(', ')}`),
        );
      }
      if (report.barcodeFailures.length > 0) {
        console.log(
          chalk.red(`  Barcode failures:        ${String(report.barcodeFailures.length)}`),
        );
        for (const f of report.barcodeFailures) {
          console.log(chalk.red(`    row ${String(f.rowIndex + 1)} / ${f.objectId}: ${f.message}`));
        }
      }
      if (report.ok) console.log(chalk.green('✓ Validation passed'));
      else process.exitCode = 1;
    });

  program
    .command('print')
    .description('Render a .label file and send to a printer')
    .requiredOption('--template <path>', '.label file')
    .requiredOption('--printer <url>', 'transport URL, e.g. usb://brother-ql or tcp://192.168.1.42')
    .option('--csv <path>', 'CSV for batch mode')
    .option('--var <kv...>', 'single variable, key=value (repeatable)')
    .option('--rows <range>', 'e.g. 1-50 or 1,3,7 for partial batch')
    .option('--density <mode>', 'light|normal|dark')
    .option('--delay <ms>', 'delay between labels in batch (default 500)', v =>
      Number.parseInt(v, 10),
    )
    .option('--dry-run', 'render only, do not print')
    .action(async (opts: PrintArgs) => {
      const result = await printCommand(opts);
      console.log(chalk.green(`✓ Sent ${String(result.sent)} label(s)`));
    });

  program
    .command('list-sheets')
    .description('Show sticker-sheet templates (built-ins + @burnmark-io/sheet-templates)')
    .option('--brand <name>', 'filter by brand (e.g. Avery, Herma, APLI)')
    .option('--paper <size>', 'filter by paper size (e.g. A4, Letter)')
    .option('--all', 'show every template from the combined registry')
    .action((opts: ListSheetsArgs) => {
      const lines = listSheetsCommand(opts);
      for (const line of lines) console.log(line);
    });

  program
    .command('list-printers')
    .description('Show installed driver packages')
    .action(async () => {
      const lines = await listPrintersCommand();
      for (const line of lines) console.log(line);
    });

  await program.parseAsync(argv);
}
