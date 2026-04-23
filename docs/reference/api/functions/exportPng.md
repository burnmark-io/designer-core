[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / exportPng

# Function: exportPng()

> **exportPng**(`doc`, `options?`): `Promise`\<`Blob`\>

Defined in: [packages/core/src/export/png.ts:12](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/export/png.ts#L12)

Export a full-colour PNG. Returns a Blob that can be saved to disk or
served directly in a browser.

On Node.js this goes via `@napi-rs/canvas`'s `toBuffer('image/png')`.
In browsers, `OffscreenCanvas.convertToBlob({ type: 'image/png' })`.

## Parameters

### doc

[`LabelDocument`](../interfaces/LabelDocument.md)

### options?

[`RenderOptions`](../interfaces/RenderOptions.md) & `object` = `{}`

## Returns

`Promise`\<`Blob`\>
