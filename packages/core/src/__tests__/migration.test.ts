import { describe, expect, it } from 'vitest';
import { DocumentMigrationError, migrateDocument, registerMigration } from '../migration.js';
import { CURRENT_DOCUMENT_VERSION } from '../types.js';

describe('migrateDocument', () => {
  it('returns v1 document unchanged (identity)', () => {
    const doc = {
      id: 'x',
      version: 1,
      name: 'test',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      canvas: {
        widthDots: 100,
        heightDots: 100,
        dpi: 300,
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        background: '#ffffff',
        grid: { enabled: false, spacingDots: 10 },
      },
      objects: [],
      metadata: {},
    };
    const migrated = migrateDocument(doc);
    expect(migrated.version).toBe(CURRENT_DOCUMENT_VERSION);
    expect(migrated.name).toBe('test');
  });

  it('throws if version is newer than supported', () => {
    const doc = { version: 999 };
    expect(() => migrateDocument(doc)).toThrow(DocumentMigrationError);
  });

  it('throws if input is not an object', () => {
    expect(() => migrateDocument('hello')).toThrow(DocumentMigrationError);
    expect(() => migrateDocument(null)).toThrow(DocumentMigrationError);
    expect(() => migrateDocument([])).toThrow(DocumentMigrationError);
  });

  it('defaults missing version to 1', () => {
    const doc = {
      id: 'x',
      name: 'no version field',
      canvas: {
        widthDots: 100,
        heightDots: 0,
        dpi: 300,
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        background: '#ffffff',
        grid: { enabled: false, spacingDots: 10 },
      },
      objects: [],
      metadata: {},
    };
    const migrated = migrateDocument(doc);
    expect(migrated.version).toBe(CURRENT_DOCUMENT_VERSION);
  });

  it('supports registering future migrations', () => {
    // Simulate registering a bogus migration to verify the chain works.
    // We can't test a real v1 → v2 migration without bumping CURRENT version,
    // so this just ensures registerMigration doesn't throw.
    expect(() => {
      registerMigration(999, d => d);
    }).not.toThrow();
  });
});
