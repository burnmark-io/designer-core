import { type LabelDocument } from '../document.js';
import { isTextObject, walkObjects } from '../objects.js';
import { type RenderWarning } from '../types.js';
import { DefaultFontLoader, type FontLoader } from '../fonts.js';

/**
 * Single shared loader for the render pipeline. Bundled fonts are
 * registered exactly once per process; subsequent calls are a no-op.
 * Tests can bypass this by calling `loader.load(family)` directly on
 * their own instance.
 */
let sharedLoader: FontLoader | null = null;

function getLoader(onWarning?: (w: RenderWarning) => void): FontLoader {
  if (sharedLoader) return sharedLoader;
  sharedLoader = new DefaultFontLoader((family, message) => {
    onWarning?.({ code: 'font.missing', message: `${family}: ${message}` });
  });
  return sharedLoader;
}

/**
 * Walk the document, collect every distinct `fontFamily`, and make sure
 * each one is loaded before rendering. Idempotent — repeated calls for
 * the same families are cheap.
 */
export async function ensureFontsLoaded(
  doc: LabelDocument,
  onWarning?: (w: RenderWarning) => void,
): Promise<void> {
  const loader = getLoader(onWarning);
  const families = new Set<string>();
  for (const obj of walkObjects(doc.objects)) {
    if (isTextObject(obj) && obj.fontFamily) families.add(obj.fontFamily);
  }
  await Promise.all([...families].map(f => loader.load(f)));
}
