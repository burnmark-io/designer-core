import { type PrinterAdapter, type PrinterDiscovery } from '@thermal-label/contracts';

/**
 * A lightweight driver registry. Each `@thermal-label/*-node` package is an
 * optional peer dependency — we try to import them dynamically and only
 * list the ones present. Missing drivers are silently ignored.
 *
 * Retrofitted drivers (v0.2+) export a `discovery: PrinterDiscovery`
 * singleton. If a driver is present but doesn't export `discovery`, it is
 * flagged at discovery-time and ignored by `openPrinter`.
 */

export interface DriverModule {
  family: string;
  packageName: string;
  discovery?: PrinterDiscovery;
  /** Set when the package is installed but failed to load (e.g. missing optional peer). */
  loadError?: string;
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
      const discovery = mod.discovery;
      const driver: DriverModule = isDiscovery(discovery)
        ? { family, packageName, discovery }
        : { family, packageName };
      found.push(driver);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Package not installed → `Cannot find package '<name>'`. Anything else
      // (e.g. optional peer missing) means the driver is installed but broken.
      if (!message.includes(`Cannot find package '${packageName}'`)) {
        found.push({ family, packageName, loadError: message });
      }
    }
  }
  return found;
}

function isDiscovery(value: unknown): value is PrinterDiscovery {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PrinterDiscovery).openPrinter === 'function' &&
    typeof (value as PrinterDiscovery).listPrinters === 'function'
  );
}

/**
 * Resolve a printer URL to an adapter instance.
 *
 * Supported schemes:
 *
 * - `usb://<family>` — open the first available printer from that driver's
 *   USB discovery. Example: `usb://brother-ql`, `usb://labelmanager`.
 * - `usb://<family>/<serial>` — open the USB printer matching the given
 *   serial number.
 * - `tcp://<host>[:<port>]` — open the brother-ql printer at the given
 *   TCP endpoint. Port defaults to 9100.
 * - `<family>` (bare) — shorthand for `usb://<family>`.
 */
export async function openPrinter(url: string): Promise<PrinterAdapter> {
  const drivers = await discoverDrivers();
  if (drivers.length === 0) {
    throw new Error(
      `No printer drivers installed. Install one of: ${KNOWN_DRIVERS.map(d => d.packageName).join(', ')}`,
    );
  }

  const broken = drivers.filter(d => d.loadError);
  const viable = drivers.filter(d => d.discovery);
  if (viable.length === 0) {
    if (broken.length > 0) {
      const detail = broken
        .map(d => `  ${d.packageName}: ${d.loadError ?? '(no detail)'}`)
        .join('\n');
      throw new Error(`Printer drivers failed to load:\n${detail}`);
    }
    throw new Error(
      `Installed drivers do not export a \`discovery\` singleton. ` +
        `Upgrade to @thermal-label/*-node@^0.2.0 or later.`,
    );
  }

  const parsed = parsePrinterUrl(url);
  const match =
    parsed.family !== undefined ? viable.find(d => d.family === parsed.family) : viable[0];
  if (!match?.discovery) {
    throw new Error(
      `No installed driver matches "${url}". Installed: ${viable.map(d => d.family).join(', ')}`,
    );
  }

  return match.discovery.openPrinter(parsed.options);
}

interface ParsedUrl {
  family?: string;
  options: {
    serialNumber?: string;
    host?: string;
    port?: number;
  };
}

function parsePrinterUrl(url: string): ParsedUrl {
  // tcp://<host>[:<port>]
  if (url.startsWith('tcp://')) {
    const rest = url.slice('tcp://'.length);
    const [host, portStr] = rest.split(':') as [string, string | undefined];
    const port = portStr ? Number.parseInt(portStr, 10) : undefined;
    const options: ParsedUrl['options'] = { host };
    if (port !== undefined && !Number.isNaN(port)) options.port = port;
    // tcp is brother-ql's domain (only family with a TCP transport).
    return { family: 'brother-ql', options };
  }

  // usb://<family>[/<serial>]
  if (url.startsWith('usb://')) {
    const rest = url.slice('usb://'.length);
    const [family, serialNumber] = rest.split('/') as [string, string | undefined];
    const options: ParsedUrl['options'] = {};
    if (serialNumber) options.serialNumber = serialNumber;
    return { family, options };
  }

  // Bare family name.
  return { family: url, options: {} };
}
