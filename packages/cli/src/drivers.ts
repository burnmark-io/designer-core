import { type PrinterAdapter } from '@thermal-label/contracts';

/**
 * A lightweight driver registry. Each `@thermal-label/*` package is an
 * optional peer dependency — we try to import them dynamically and only
 * list the ones present. Missing drivers are silently ignored.
 *
 * Drivers are expected to export a `createAdapter(url: string): PrinterAdapter`
 * factory. If a driver is present but doesn't match this shape, a helpful
 * error is thrown at use-time, not at discovery-time.
 */

export interface DriverModule {
  family: string;
  packageName: string;
  createAdapter?: (url: string) => PrinterAdapter | Promise<PrinterAdapter>;
}

const KNOWN_DRIVERS: { packageName: string; family: string }[] = [
  { packageName: '@thermal-label/labelmanager-node', family: 'labelmanager' },
  { packageName: '@thermal-label/labelwriter-node', family: 'labelwriter' },
  { packageName: '@thermal-label/brother-ql-node', family: 'brother-ql' },
];

export async function discoverDrivers(): Promise<DriverModule[]> {
  const found: DriverModule[] = [];
  for (const { packageName, family } of KNOWN_DRIVERS) {
    try {
      const mod = (await import(packageName)) as Record<string, unknown>;
      const factory = mod.createAdapter;
      const driver: DriverModule =
        typeof factory === 'function'
          ? {
              family,
              packageName,
              createAdapter: factory as NonNullable<DriverModule['createAdapter']>,
            }
          : { family, packageName };
      found.push(driver);
    } catch {
      // Driver not installed — skip silently.
    }
  }
  return found;
}

/**
 * Resolve a printer URL (e.g. `usb://brother-ql` or `tcp://192.168.1.42`)
 * to an adapter instance. Drivers decide which URL schemes they handle.
 */
export async function openPrinter(url: string): Promise<PrinterAdapter> {
  const drivers = await discoverDrivers();
  if (drivers.length === 0) {
    throw new Error(
      `No printer drivers installed. Install one of: ${KNOWN_DRIVERS.map(d => d.packageName).join(', ')}`,
    );
  }

  const familyHint = inferFamilyFromUrl(url);

  // Prefer drivers matching the family hint, in order.
  const ordered = familyHint
    ? [
        ...drivers.filter(d => d.family === familyHint),
        ...drivers.filter(d => d.family !== familyHint),
      ]
    : drivers;

  for (const driver of ordered) {
    if (!driver.createAdapter) continue;
    try {
      const adapter = await driver.createAdapter(url);
      return adapter;
    } catch {
      // Driver couldn't handle this URL — try the next one.
    }
  }

  throw new Error(
    `No installed driver could handle URL "${url}". Installed: ${drivers
      .map(d => d.packageName)
      .join(', ')}`,
  );
}

function inferFamilyFromUrl(url: string): string | undefined {
  const lower = url.toLowerCase();
  if (lower.includes('brother-ql') || lower.includes('brother_ql')) return 'brother-ql';
  if (lower.includes('labelmanager')) return 'labelmanager';
  if (lower.includes('labelwriter') || lower.includes('dymo')) return 'labelwriter';
  return undefined;
}
