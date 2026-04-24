#!/usr/bin/env node
/**
 * Copy non-TypeScript assets from `src/` into the build output.
 * Run by the package `build` script after `tsc` completes.
 *
 * Today this covers the bundled font files — `tsc` only emits `.js` /
 * `.d.ts`, so the `.woff2` and license text need to be copied by hand.
 */

import { mkdir, readdir, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '..');

async function copyDir(relative) {
  const src = resolve(packageRoot, 'src', relative);
  const dst = resolve(packageRoot, 'dist', relative);
  await mkdir(dst, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) continue; // no nested directories in our asset dirs
    if (entry.name.startsWith('.')) continue;
    await copyFile(resolve(src, entry.name), resolve(dst, entry.name));
  }
}

await copyDir('fonts/bundled');
