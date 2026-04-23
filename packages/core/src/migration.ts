import { CURRENT_DOCUMENT_VERSION } from './types.js';
import { type LabelDocument } from './document.js';

export class DocumentMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentMigrationError';
  }
}

type Migration = (doc: unknown) => unknown;

/**
 * Version registry. Each entry migrates FROM that version TO version+1.
 *
 * v1 is the current schema — the migration slot at `1` is unused (it would
 * migrate v1 → v2 when v2 is introduced). The registry exists from day one
 * so `.label` files created today can be opened by future versions without
 * special-casing.
 */
const MIGRATIONS: Record<number, Migration> = {};

export function registerMigration(fromVersion: number, migrate: Migration): void {
  MIGRATIONS[fromVersion] = migrate;
}

/**
 * Apply migrations sequentially until `doc.version === CURRENT_DOCUMENT_VERSION`.
 * Throws `DocumentMigrationError` if the document's version is newer than
 * the current runtime or if an intermediate migration is missing.
 */
export function migrateDocument(input: unknown): LabelDocument {
  if (!isRecord(input)) {
    throw new DocumentMigrationError('Not a valid document: expected an object');
  }

  const rawVersion = (input as { version?: unknown }).version;
  let version = typeof rawVersion === 'number' ? rawVersion : 1;

  if (version > CURRENT_DOCUMENT_VERSION) {
    throw new DocumentMigrationError(
      `Document version ${String(version)} is newer than supported version ${String(
        CURRENT_DOCUMENT_VERSION,
      )}. Upgrade @burnmark-io/designer-core.`,
    );
  }

  let current: unknown = input;
  while (version < CURRENT_DOCUMENT_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) {
      throw new DocumentMigrationError(
        `No migration registered for version ${String(version)} → ${String(version + 1)}`,
      );
    }
    current = migrate(current);
    version += 1;
  }

  const out = current as LabelDocument;
  out.version = CURRENT_DOCUMENT_VERSION;
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
