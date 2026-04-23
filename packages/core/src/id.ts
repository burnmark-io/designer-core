import { randomUUID as nodeRandomUUID } from 'node:crypto';

/**
 * Generate a UUID v4. Prefers `globalThis.crypto.randomUUID` (browser +
 * Node 19+), falls back to Node's `crypto` module.
 */
export function randomUUID(): string {
  const g: { crypto?: { randomUUID?: () => string } } = globalThis;
  if (typeof g.crypto?.randomUUID === 'function') {
    return g.crypto.randomUUID();
  }
  return nodeRandomUUID();
}
