[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / exportPdf

# Function: exportPdf()

> **exportPdf**(`doc`, `rows?`, `options?`): `Promise`\<`Blob`\>

Defined in: [packages/core/src/export/pdf.ts:10](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/export/pdf.ts#L10)

Export a full-colour PDF. One page per document (or per CSV row if
`rows` is provided). Pages are sized to match the rendered image at
the document's DPI.

## Parameters

### doc

[`LabelDocument`](../interfaces/LabelDocument.md)

### rows?

`Record`\<`string`, `string`\>[]

### options?

[`RenderOptions`](../interfaces/RenderOptions.md) = `{}`

## Returns

`Promise`\<`Blob`\>
