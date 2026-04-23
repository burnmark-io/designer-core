[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / renderFull

# Function: renderFull()

> **renderFull**(`doc`, `options?`): `Promise`\<[`RawImageData`](../interfaces/RawImageData.md)\>

Defined in: [packages/core/src/render/pipeline.ts:21](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/render/pipeline.ts#L21)

Render a document to a single full-colour RGBA canvas. No plane splitting
or bitmap conversion — caller is responsible for those steps.

## Parameters

### doc

[`LabelDocument`](../interfaces/LabelDocument.md)

### options?

[`RenderOptions`](../interfaces/RenderOptions.md) = `{}`

## Returns

`Promise`\<[`RawImageData`](../interfaces/RawImageData.md)\>
