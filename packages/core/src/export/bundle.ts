import JSZip from 'jszip';
import { type LabelDocument } from '../document.js';
import { type AssetLoader } from '../assets.js';
import { isImageObject, walkObjects } from '../objects.js';
import { toJSON } from '../serialisation.js';

/**
 * Bundle a document and its referenced assets into a ZIP. The ZIP contains:
 *
 * - `label.json` — the serialised document
 * - `assets/<assetKey>` — one entry per unique assetKey in the document
 *
 * Assets are fetched via the supplied `AssetLoader`. If an asset is missing,
 * it's omitted from the bundle and reported in the `missing` return.
 */
export async function exportBundled(
  doc: LabelDocument,
  assetLoader: AssetLoader,
): Promise<{ blob: Blob; missing: string[] }> {
  const zip = new JSZip();
  zip.file('label.json', toJSON(doc));

  const keys = new Set<string>();
  for (const obj of walkObjects(doc.objects)) {
    if (isImageObject(obj) && obj.assetKey) keys.add(obj.assetKey);
  }

  const missing: string[] = [];
  for (const key of keys) {
    try {
      const bytes = await assetLoader.load(key);
      zip.file(`assets/${key}`, bytes);
    } catch {
      missing.push(key);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, missing };
}
