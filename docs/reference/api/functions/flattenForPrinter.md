[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / flattenForPrinter

# Function: flattenForPrinter()

> **flattenForPrinter**(`doc`, `capabilities`, `options?`): `Promise`\<`Map`\<`string`, [`LabelBitmap`](../interfaces/LabelBitmap.md)\>\>

Defined in: [packages/core/src/flatten.ts:11](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/flatten.ts#L11)

Render a document to printer planes (1bpp bitmaps, one per plane in
`capabilities.colors`). Thin wrapper around `renderPlanes` — kept as a
stable top-level public function for the common case.

## Parameters

### doc

[`LabelDocument`](../interfaces/LabelDocument.md)

### capabilities

[`PrinterCapabilities`](../interfaces/PrinterCapabilities.md)

### options?

[`RenderOptions`](../interfaces/RenderOptions.md) = `{}`

## Returns

`Promise`\<`Map`\<`string`, [`LabelBitmap`](../interfaces/LabelBitmap.md)\>\>
