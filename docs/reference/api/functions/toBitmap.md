[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / toBitmap

# Function: toBitmap()

> **toBitmap**(`rgba`, `options?`): [`LabelBitmap`](../interfaces/LabelBitmap.md)

Defined in: [packages/core/src/render/pipeline.ts:78](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/render/pipeline.ts#L78)

Convert RawImageData (RGBA) to a 1bpp `LabelBitmap` via @mbtech-nl/bitmap.
Uses Floyd–Steinberg dithering by default; threshold defaults to 128.

## Parameters

### rgba

[`RawImageData`](../interfaces/RawImageData.md)

### options?

#### dither?

`boolean`

#### invert?

`boolean`

#### threshold?

`number`

## Returns

[`LabelBitmap`](../interfaces/LabelBitmap.md)
