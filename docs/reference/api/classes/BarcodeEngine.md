[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / BarcodeEngine

# Class: BarcodeEngine

Defined in: [packages/core/src/render/barcode.ts:125](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/render/barcode.ts#L125)

Barcode rendering engine. Renders barcodes into an intermediate
`Image`-like object that can be drawn onto the main canvas via
`ctx.drawImage`.

## Constructors

### Constructor

> **new BarcodeEngine**(): `BarcodeEngine`

#### Returns

`BarcodeEngine`

## Methods

### renderToImage()

> **renderToImage**(`format`, `data`, `options?`): `Promise`\<\{ `height`: `number`; `image`: `unknown`; `width`: `number`; \}\>

Defined in: [packages/core/src/render/barcode.ts:131](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/render/barcode.ts#L131)

Render a barcode to an image decodable by the platform canvas.
Returns `unknown` because the concrete type differs between Node
(`@napi-rs/canvas` Image) and browsers (ImageBitmap).

#### Parameters

##### format

[`BarcodeFormat`](../type-aliases/BarcodeFormat.md)

##### data

`string`

##### options?

[`BarcodeOptions`](../interfaces/BarcodeOptions.md) = `{}`

#### Returns

`Promise`\<\{ `height`: `number`; `image`: `unknown`; `width`: `number`; \}\>

***

### validate()

> **validate**(`format`, `data`, `options?`): `Promise`\<[`ValidationResult`](../interfaces/ValidationResult.md)\>

Defined in: [packages/core/src/render/barcode.ts:163](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/render/barcode.ts#L163)

#### Parameters

##### format

[`BarcodeFormat`](../type-aliases/BarcodeFormat.md)

##### data

`string`

##### options?

[`BarcodeOptions`](../interfaces/BarcodeOptions.md) = `{}`

#### Returns

`Promise`\<[`ValidationResult`](../interfaces/ValidationResult.md)\>
