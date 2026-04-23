/**
 * Asset loader interface and in-memory default implementation.
 *
 * The design model stores images by `assetKey` — a content-addressed key
 * into an asset store. Consuming apps are free to back this with IndexedDB,
 * the filesystem, S3, or anything else. The in-memory implementation is
 * convenient for scripts and tests.
 */

export interface AssetLoader {
  load(key: string): Promise<Uint8Array>;
  store(data: Uint8Array | ArrayBuffer): Promise<string>;
  has(key: string): Promise<boolean>;
}

/** Simple in-memory asset store. Keys are stable sha1-ish hashes of content. */
export class InMemoryAssetLoader implements AssetLoader {
  private readonly map = new Map<string, Uint8Array>();

  async load(key: string): Promise<Uint8Array> {
    const data = this.map.get(key);
    if (!data) throw new Error(`Asset not found: ${key}`);
    return Promise.resolve(data);
  }

  async store(data: Uint8Array | ArrayBuffer): Promise<string> {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const key = await hashBytes(bytes);
    this.map.set(key, bytes);
    return key;
  }

  async has(key: string): Promise<boolean> {
    return Promise.resolve(this.map.has(key));
  }

  set(key: string, data: Uint8Array): void {
    this.map.set(key, data);
  }
}

async function hashBytes(data: Uint8Array): Promise<string> {
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const digest = await globalThis.crypto.subtle.digest('SHA-1', arrayBuffer);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
