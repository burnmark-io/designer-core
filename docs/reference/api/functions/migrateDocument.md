[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / migrateDocument

# Function: migrateDocument()

> **migrateDocument**(`input`): [`LabelDocument`](../interfaces/LabelDocument.md)

Defined in: [packages/core/src/migration.ts:32](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/migration.ts#L32)

Apply migrations sequentially until `doc.version === CURRENT_DOCUMENT_VERSION`.
Throws `DocumentMigrationError` if the document's version is newer than
the current runtime or if an intermediate migration is missing.

## Parameters

### input

`unknown`

## Returns

[`LabelDocument`](../interfaces/LabelDocument.md)
