[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / extractPlaceholders

# Function: extractPlaceholders()

> **extractPlaceholders**(`doc`): `string`[]

Defined in: [packages/core/src/template.ts:28](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/template.ts#L28)

Walk the document and return every `{{placeholder}}` key referenced
(across text content and barcode data), deduplicated and lowercased.

## Parameters

### doc

[`LabelDocument`](../interfaces/LabelDocument.md)

## Returns

`string`[]
