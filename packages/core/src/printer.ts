import { type PrinterCapabilities } from './types.js';
import { type LabelBitmap } from '@mbtech-nl/bitmap';
import { type LabelDocument } from './document.js';

/**
 * Printer adapter — implemented by vendor driver packages (e.g.
 * `@thermal-label/labelmanager-node`, `@thermal-label/brother-ql-node`).
 *
 * Core defines the interface; drivers provide transport (USB, TCP/IP,
 * Bluetooth) and the wire-format conversion for a given printer family.
 *
 * The `print` method accepts `Map<string, LabelBitmap>` — one entry per
 * plane in the driver's `capabilities`. For single-colour printers the
 * map has one entry (e.g. `'black'`); for two-colour, two. Drivers extract
 * the planes they know about and ignore any extras.
 */
export interface PrinterAdapter {
  readonly family: string;
  readonly model: string;
  readonly connected: boolean;
  readonly capabilities: PrinterCapabilities;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): Promise<PrinterStatus>;
  print(planes: Map<string, LabelBitmap>, options?: PrintOptions): Promise<void>;
}

export interface PrinterStatus {
  ready: boolean;
  mediaLoaded: boolean;
  mediaWidthMm?: number;
  mediaType?: string;
  errors: string[];
}

export interface PrintOptions {
  density?: 'light' | 'normal' | 'dark';
  copies?: number;
}

/**
 * Storage for label documents. Implementations: IndexedDB (browser apps),
 * filesystem (CLI/scripts), cloud stores.
 */
export interface LabelStore {
  save(doc: LabelDocument): Promise<void>;
  load(id: string): Promise<LabelDocument>;
  list(): Promise<LabelSummary[]>;
  delete(id: string): Promise<void>;
}

export interface LabelSummary {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Storage for binary assets (images). Mirrors the `AssetLoader` interface
 * but sits at the application persistence layer rather than the render
 * loader. A single implementation often satisfies both interfaces.
 */
export interface AssetStore {
  store(data: Uint8Array | ArrayBuffer, mimeType: string): Promise<string>;
  load(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
}
