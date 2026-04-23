[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / fromJSON

# Function: fromJSON()

> **fromJSON**(`input`): [`LabelDocument`](../interfaces/LabelDocument.md)

Defined in: [packages/core/src/serialisation.ts:17](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/serialisation.ts#L17)

Parse a `.label` JSON string into a `LabelDocument`, applying any needed
migrations. Throws if the JSON is invalid or the document version is
unsupported.

## Parameters

### input

`string`

## Returns

[`LabelDocument`](../interfaces/LabelDocument.md)
