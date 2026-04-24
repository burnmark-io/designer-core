import { labelsPerPage, listSheets } from '@burnmark-io/designer-core';
import { discoverDrivers } from '../drivers.js';

export function listSheetsCommand(): string[] {
  const lines = listSheets().map(s => {
    const perPage = labelsPerPage(s);
    return `${s.code.padEnd(18)} ${s.paperSize.padEnd(7)} ${String(perPage).padStart(3)}/page — ${s.name}`;
  });
  lines.push('');
  lines.push('Install @burnmark-io/sheet-templates for hundreds of additional templates:');
  lines.push('  pnpm add @burnmark-io/sheet-templates');
  return lines;
}

export async function listPrintersCommand(): Promise<string[]> {
  const drivers = await discoverDrivers();
  if (drivers.length === 0) {
    return ['No printer drivers installed.'];
  }
  return drivers.map(
    d =>
      `${d.family.padEnd(15)} ${d.packageName}${d.createAdapter ? '' : '  (no createAdapter export)'}`,
  );
}
