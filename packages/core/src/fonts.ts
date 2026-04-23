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
}

/**
 * The four bundled `Burnmark *` families map to open-license typefaces. The
 * actual WOFF2 subsets are expected at `src/fonts/bundled/*.woff2`. See D4
 * in `DECISIONS.md` for the current status of file inclusion.
 */
export const BUNDLED_FONTS: Record<BundledFontFamily, BundledFontEntry> = {
  'Burnmark Sans': { family: 'Burnmark Sans', actualFont: 'Inter', license: 'OFL' },
  'Burnmark Mono': { family: 'Burnmark Mono', actualFont: 'JetBrains Mono', license: 'OFL' },
  'Burnmark Serif': { family: 'Burnmark Serif', actualFont: 'Bitter', license: 'OFL' },
  'Burnmark Narrow': {
    family: 'Burnmark Narrow',
    actualFont: 'Barlow Condensed',
    license: 'OFL',
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
    const gb = globalThis as unknown as {
      FontFace?: typeof FontFace;
      fonts?: { add: (f: FontFace) => void };
    };
    if (typeof gb.FontFace === 'function') {
      const ff = new gb.FontFace(family, coerceBrowserSource(source));
      await ff.load();
      gb.fonts?.add(ff);
      this.loaded.set(family, { family, source: 'user' });
      return;
    }

    // Node path
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
    this.loaded.set(family, { family, source: 'user' });
  }

  async load(family: string): Promise<void> {
    if (this.loaded.has(family)) return;
    if (isBundledFamily(family)) {
      // Bundled font files are expected at a known path relative to this module.
      // If they're missing, warn and use the platform fallback.
      this.warn(
        family,
        `Bundled font "${family}" not present as a WOFF2 file. Falling back to platform default. ` +
          `See README "Fonts — replacing placeholder files".`,
      );
      this.loaded.set(family, { family, source: 'bundled', bundledId: family });
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

function coerceBrowserSource(source: ArrayBuffer | Uint8Array | string): ArrayBuffer | string {
  if (typeof source === 'string') return source;
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
