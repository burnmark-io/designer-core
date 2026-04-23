[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / renderPlanesFn

# Function: renderPlanesFn()

> **renderPlanesFn**(`doc`, `capabilities`, `options?`): `Promise`\<`Map`\<`string`, [`LabelBitmap`](../interfaces/LabelBitmap.md)\>\>

Defined in: [packages/core/src/render/pipeline.ts:102](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/render/pipeline.ts#L102)

Render planes directly to 1bpp LabelBitmaps — the common case for
sending to a printer.

Overlap resolution: where a non-default plane and the default (wildcard)
plane both have a set bit at the same position, the non-default plane
wins the pixel, and it is cleared from the default plane. Matches the
Brother QL firmware's behaviour when a red and black bit collide.

## Parameters

### doc

[`LabelDocument`](../interfaces/LabelDocument.md)

### capabilities

[`PrinterCapabilities`](../interfaces/PrinterCapabilities.md)

### options?

[`RenderOptions`](../interfaces/RenderOptions.md) = `{}`

## Returns

`Promise`\<`Map`\<`string`, [`LabelBitmap`](../interfaces/LabelBitmap.md)\>\>
