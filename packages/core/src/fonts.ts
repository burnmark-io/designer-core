import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export interface FontDescriptor {
  family: string;
  source: 'bundled' | 'user' | 'system';
  bundledId?: BundledFontFamily;
}

export type BundledFontFamily =
  | 'Burnmark Sans'
  | 'Burnmark Mono'
  | 'Burnmark Serif'
  | 'Burnmark Narrow';

export interface BundledFontEntry {
  family: BundledFontFamily;
  actualFont: string;
  license: string;
  /** File stems relative to `src/fonts/bundled/`. */
  files: { regular: string; bold: string };
}

/**
 * The four bundled `Burnmark *` families map to open-license typefaces.
 * WOFF2 subsets live next to this module at `./fonts/bundled/*.woff2`
 * and are copied into `dist/fonts/bundled/` by the package build.
 */
export const BUNDLED_FONTS: Record<BundledFontFamily, BundledFontEntry> = {
  'Burnmark Sans': {
    family: 'Burnmark Sans',
    actualFont: 'Inter',
    license: 'OFL',
    files: { regular: 'burnmark-sans.woff2', bold: 'burnmark-sans-bold.woff2' },
  },
  'Burnmark Mono': {
    family: 'Burnmark Mono',
    actualFont: 'JetBrains Mono',
    license: 'OFL',
    files: { regular: 'burnmark-mono.woff2', bold: 'burnmark-mono-bold.woff2' },
  },
  'Burnmark Serif': {
    family: 'Burnmark Serif',
    actualFont: 'Bitter',
    license: 'OFL',
    files: { regular: 'burnmark-serif.woff2', bold: 'burnmark-serif-bold.woff2' },
  },
  'Burnmark Narrow': {
    family: 'Burnmark Narrow',
    actualFont: 'Barlow Condensed',
    license: 'OFL',
    files: { regular: 'burnmark-narrow.woff2', bold: 'burnmark-narrow-bold.woff2' },
  },
};

export interface FontLoader {
  load(family: string): Promise<void>;
  register(family: string, source: ArrayBuffer | Uint8Array | string): Promise<void>;
  isLoaded(family: string): boolean;
  listLoaded(): FontDescriptor[];
}

/**
 * Default FontLoader. Uses the Font Loading API in browsers and
 * `@napi-rs/canvas`'s GlobalFonts in Node.js. Unknown families emit a
 * warning via the supplied `warn` callback (if any) and are treated as a
 * fallback to the first bundled sans family.
 */
export class DefaultFontLoader implements FontLoader {
  private readonly loaded = new Map<string, FontDescriptor>();
  private readonly warn: (family: string, reason: string) => void;

  constructor(warn?: (family: string, reason: string) => void) {
    this.warn =
      warn ??
      ((): void => {
        /* no-op */
      });
  }

  async register(family: string, source: ArrayBuffer | Uint8Array | string): Promise<void> {
    await registerBytes(family, source, 'normal');
    this.loaded.set(family, { family, source: 'user' });
  }

  async load(family: string): Promise<void> {
    if (this.loaded.has(family)) return;
    if (isBundledFamily(family)) {
      const entry = BUNDLED_FONTS[family];
      try {
        await loadBundledFont(family, entry);
        this.loaded.set(family, { family, source: 'bundled', bundledId: family });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.warn(
          family,
          `Bundled font "${family}" failed to load: ${message}. Falling back to platform default.`,
        );
        // Mark loaded so repeated renders don't re-throw; rendering falls
        // through to @napi-rs/canvas's own fallback.
        this.loaded.set(family, { family, source: 'bundled', bundledId: family });
      }
      return;
    }
    this.warn(
      family,
      `Font "${family}" not loaded; rendering may fall back to the platform default.`,
    );
    this.loaded.set(family, { family, source: 'system' });
    return Promise.resolve();
  }

  isLoaded(family: string): boolean {
    return this.loaded.has(family);
  }

  listLoaded(): FontDescriptor[] {
    return [...this.loaded.values()];
  }
}

function isBundledFamily(family: string): family is BundledFontFamily {
  return family in BUNDLED_FONTS;
}

/**
 * Locate the `fonts/bundled/` directory relative to the compiled module.
 * Works under Node.js (ESM import.meta.url) and, as a no-op, in browser
 * builds where the caller never reaches the Node path at runtime.
 */
function bundledDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), 'fonts', 'bundled');
}

async function loadBundledFont(family: string, entry: BundledFontEntry): Promise<void> {
  const gb = globalThis as unknown as {
    FontFace?: typeof FontFace;
    fonts?: { add: (f: FontFace) => void };
  };

  if (typeof gb.FontFace === 'function') {
    // Browser: assume the app has configured its bundler to serve the
    // bundled woff2 files alongside the package, and load them by URL.
    // Applications that need a different URL scheme should call
    // `registerFont(family, ArrayBuffer)` themselves before the first
    // render.
    const base = new URL('./fonts/bundled/', import.meta.url);
    await Promise.all([
      loadFontFace(family, new URL(entry.files.regular, base).href, 'normal'),
      loadFontFace(family, new URL(entry.files.bold, base).href, 'bold'),
    ]);
    return;
  }

  // Node path — register both weights against the same family name.
  const mod = (await import('@napi-rs/canvas')) as unknown as {
    GlobalFonts: {
      register: (data: Buffer | Uint8Array, name?: string) => unknown;
      registerFromPath: (path: string, name?: string) => unknown;
      has: (name: string) => boolean;
    };
  };
  const dir = bundledDir();
  mod.GlobalFonts.registerFromPath(resolve(dir, entry.files.regular), family);
  mod.GlobalFonts.registerFromPath(resolve(dir, entry.files.bold), family);
}

async function loadFontFace(family: string, url: string, weight: 'normal' | 'bold'): Promise<void> {
  const gb = globalThis as unknown as {
    FontFace: typeof FontFace;
    fonts?: { add: (f: FontFace) => void };
  };
  const ff = new gb.FontFace(family, `url(${url})`, { weight });
  await ff.load();
  gb.fonts?.add(ff);
}

async function registerBytes(
  family: string,
  source: ArrayBuffer | Uint8Array | string,
  weight: 'normal' | 'bold',
): Promise<void> {
  const gb = globalThis as unknown as {
    FontFace?: typeof FontFace;
    fonts?: { add: (f: FontFace) => void };
  };
  if (typeof gb.FontFace === 'function') {
    const ff = new gb.FontFace(family, coerceBrowserSource(source), { weight });
    await ff.load();
    gb.fonts?.add(ff);
    return;
  }

  const mod = (await import('@napi-rs/canvas')) as unknown as {
    GlobalFonts: {
      register: (data: Buffer | Uint8Array, name?: string) => unknown;
      registerFromPath: (path: string, name?: string) => unknown;
    };
  };
  if (typeof source === 'string') {
    mod.GlobalFonts.registerFromPath(source, family);
  } else {
    const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
    mod.GlobalFonts.register(bytes, family);
  }
}

function coerceBrowserSource(source: ArrayBuffer | Uint8Array | string): ArrayBuffer | string {
  if (typeof source === 'string') return `url(${source})`;
  if (source instanceof Uint8Array) {
    const copy = new Uint8Array(source);
    return copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength);
  }
  return source;
}

const SHARED_LOADER = new DefaultFontLoader();

export async function registerFont(
  family: string,
  source: ArrayBuffer | Uint8Array | string,
): Promise<void> {
  await SHARED_LOADER.register(family, source);
}

export function isFontLoaded(family: string): boolean {
  return SHARED_LOADER.isLoaded(family);
}

export function listFonts(): FontDescriptor[] {
  return SHARED_LOADER.listLoaded();
}
