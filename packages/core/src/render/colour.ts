import { type PrinterCapabilities } from '../types.js';
import { type LabelObject } from '../objects.js';

export const SINGLE_COLOR: PrinterCapabilities = {
  colors: [{ name: 'black', cssMatch: ['*'] }],
};

export const TWO_COLOR_BLACK_RED: PrinterCapabilities = {
  colors: [
    { name: 'black', cssMatch: ['*'] },
    {
      name: 'red',
      cssMatch: [
        '#ff0000',
        '#f00',
        'red',
        '#cc0000',
        '#ff3333',
        '#e60000',
        '#b30000',
        '#ff1a1a',
        'darkred',
        'crimson',
      ],
    },
  ],
};

/**
 * Map an object colour to a printer plane by explicit matching only. No RGB
 * heuristics. If the colour is listed in a plane's `cssMatch` array, that
 * plane wins. Otherwise the wildcard plane (`'*'`) is the default.
 *
 * First non-wildcard match wins, in the order `capabilities.colors` is
 * declared. If no non-wildcard plane matches, the first plane with `'*'`
 * in its `cssMatch` is used.
 */
export function matchColourToPlane(objectColor: string, capabilities: PrinterCapabilities): string {
  const normalised = objectColor.trim().toLowerCase();

  // Non-wildcard matches first.
  for (const plane of capabilities.colors) {
    if (plane.cssMatch.includes('*')) continue;
    if (plane.cssMatch.some(c => c.toLowerCase() === normalised)) {
      return plane.name;
    }
  }

  // Fall through to wildcard plane.
  const defaultPlane = capabilities.colors.find(p => p.cssMatch.includes('*'));
  return defaultPlane?.name ?? capabilities.colors[0]?.name ?? 'black';
}

/**
 * Split a flat list of objects into per-plane lists based on their colour.
 * Objects preserve z-order within each plane.
 */
export function partitionByPlane(
  objects: LabelObject[],
  capabilities: PrinterCapabilities,
): Map<string, LabelObject[]> {
  const out = new Map<string, LabelObject[]>();
  for (const plane of capabilities.colors) out.set(plane.name, []);

  for (const obj of objects) {
    const plane = matchColourToPlane(obj.color, capabilities);
    const bucket = out.get(plane);
    if (bucket) bucket.push(obj);
  }

  return out;
}
