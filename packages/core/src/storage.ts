import { type LabelDocument } from './document.js';

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
