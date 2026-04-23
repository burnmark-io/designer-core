import { listSheets } from '@burnmark-io/designer-core';
import { discoverDrivers } from '../drivers.js';

export function listSheetsCommand(): string[] {
  return listSheets().map(
    s =>
      `${s.code.padEnd(18)} ${s.paperSize.padEnd(7)} ${String(s.rows)}×${String(s.columns)} — ${s.name}`,
  );
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
