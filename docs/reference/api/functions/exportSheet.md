[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / exportSheet

# Function: exportSheet()

> **exportSheet**(`doc`, `sheet`, `rows?`, `options?`): `Promise`\<`Blob`\>

Defined in: [packages/core/src/export/sheet.ts:45](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/export/sheet.ts#L45)

Export a sticker sheet PDF. Tiles the label design across the
`SheetTemplate`. If `rows` is supplied, each row is rendered as a unique
label on consecutive sheet positions, creating additional sheets as
needed. Otherwise every position is filled with the same label.

## Parameters

### doc

[`LabelDocument`](../interfaces/LabelDocument.md)

### sheet

[`SheetTemplate`](../interfaces/SheetTemplate.md)

### rows?

`Record`\<`string`, `string`\>[]

### options?

[`RenderOptions`](../interfaces/RenderOptions.md) = `{}`

## Returns

`Promise`\<`Blob`\>
