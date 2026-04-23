import { migrateDocument } from './migration.js';
import { type LabelDocument } from './document.js';

/**
 * Serialise a document to a stable, pretty-printed JSON string.
 * The output is the `.label` file format. Round-trip safe.
 */
export function toJSON(doc: LabelDocument): string {
  return JSON.stringify(doc, null, 2);
}

/**
 * Parse a `.label` JSON string into a `LabelDocument`, applying any needed
 * migrations. Throws if the JSON is invalid or the document version is
 * unsupported.
 */
export function fromJSON(input: string): LabelDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid .label JSON: ${message}`);
  }
  return migrateDocument(parsed);
}
