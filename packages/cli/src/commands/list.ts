import { labelsPerPage, listSheets, type SheetTemplate } from '@burnmark-io/designer-core';
import { SHEETS as REGISTRY_SHEETS } from '@burnmark-io/sheet-templates';
import { discoverDrivers } from '../drivers.js';

export interface ListSheetsArgs {
  brand?: string;
  paper?: string;
  all?: boolean;
}

/**
 * Resolve a sheet code against the full registry (sheet-templates) first,
 * then fall back to the built-in set. Used by `render` and `print` so
 * `--sheet <code>` Just Works for any template either source provides.
 */
export function resolveSheet(code: string): SheetTemplate | undefined {
  return REGISTRY_SHEETS.find(s => s.code === code) ?? listSheets().find(s => s.code === code);
}

/** Merge sheet-templates + built-ins. sheet-templates wins on code collisions. */
export function allSheets(): SheetTemplate[] {
  const byCode = new Map<string, SheetTemplate>();
  for (const s of REGISTRY_SHEETS) byCode.set(s.code, s);
  for (const s of listSheets()) if (!byCode.has(s.code)) byCode.set(s.code, s);
  return [...byCode.values()];
}

export function listSheetsCommand(args: ListSheetsArgs = {}): string[] {
  const merged = allSheets();
  const filtered = merged.filter(s => {
    if (args.brand && !sheetBrand(s).toLowerCase().includes(args.brand.toLowerCase())) return false;
    if (args.paper && s.paperSize.toLowerCase() !== args.paper.toLowerCase()) return false;
    return true;
  });

  // With no filters and no --all, the registry is too big to dump raw.
  // Show built-ins and a summary pointing at the filters.
  if (!args.brand && !args.paper && !args.all) {
    const builtIns = listSheets();
    const extra = merged.length - builtIns.length;
    const lines = builtIns.map(formatSheet);
    if (extra > 0) {
      lines.push('');
      lines.push(`+ ${String(extra)} more templates from @burnmark-io/sheet-templates.`);
      lines.push('  Filter with --brand <name> or --paper <A4|Letter|...>, or see all with --all.');
    }
    return lines;
  }

  const lines = filtered.map(formatSheet);
  if (filtered.length === 0) {
    lines.push('No sheets matched the given filters.');
  } else if (filtered.length >= 50 && !args.all) {
    lines.push('');
    lines.push(
      `(showing ${String(filtered.length)} sheets — narrow with --brand / --paper, or pass --all to confirm this is what you want)`,
    );
  }
  return lines;
}

function formatSheet(s: SheetTemplate): string {
  const perPage = labelsPerPage(s);
  return `${s.code.padEnd(24)} ${s.paperSize.padEnd(7)} ${String(perPage).padStart(3)}/page — ${s.name}`;
}

function sheetBrand(s: SheetTemplate): string {
  // `brand` is a sheet-templates field; our built-ins don't carry it.
  // Fall back to the first hyphen-separated segment of the code
  // (e.g. `avery-l7160` -> `avery`) so built-ins still filter.
  const withBrand = s as SheetTemplate & { brand?: string };
  return withBrand.brand ?? s.code.split('-')[0] ?? '';
}

export async function listPrintersCommand(): Promise<string[]> {
  const drivers = await discoverDrivers();
  if (drivers.length === 0) {
    return ['No printer drivers installed.'];
  }
  return drivers.map(d => {
    const marker = d.discovery
      ? ''
      : d.loadError
        ? `  (load failed: ${d.loadError})`
        : '  (no discovery export)';
    return `${d.family.padEnd(15)} ${d.packageName}${marker}`;
  });
}
