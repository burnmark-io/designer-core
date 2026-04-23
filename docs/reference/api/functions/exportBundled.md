[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / exportBundled

# Function: exportBundled()

> **exportBundled**(`doc`, `assetLoader`): `Promise`\<\{ `blob`: `Blob`; `missing`: `string`[]; \}\>

Defined in: [packages/core/src/export/bundle.ts:16](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/export/bundle.ts#L16)

Bundle a document and its referenced assets into a ZIP. The ZIP contains:

- `label.json` — the serialised document
- `assets/<assetKey>` — one entry per unique assetKey in the document

Assets are fetched via the supplied `AssetLoader`. If an asset is missing,
it's omitted from the bundle and reported in the `missing` return.

## Parameters

### doc

[`LabelDocument`](../interfaces/LabelDocument.md)

### assetLoader

[`AssetLoader`](../interfaces/AssetLoader.md)

## Returns

`Promise`\<\{ `blob`: `Blob`; `missing`: `string`[]; \}\>
