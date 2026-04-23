[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / renderPlaneImages

# Function: renderPlaneImages()

> **renderPlaneImages**(`doc`, `capabilities`, `options?`): `Promise`\<`Map`\<`string`, [`RawImageData`](../interfaces/RawImageData.md)\>\>

Defined in: [packages/core/src/render/pipeline.ts:49](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/render/pipeline.ts#L49)

Render each printer plane as its own full-colour canvas.
For each plane, only the objects that map to that plane are rendered.
Returns one RawImageData per plane.

## Parameters

### doc

[`LabelDocument`](../interfaces/LabelDocument.md)

### capabilities

[`PrinterCapabilities`](../interfaces/PrinterCapabilities.md)

### options?

[`RenderOptions`](../interfaces/RenderOptions.md) = `{}`

## Returns

`Promise`\<`Map`\<`string`, [`RawImageData`](../interfaces/RawImageData.md)\>\>
