[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / applyVariables

# Function: applyVariables()

> **applyVariables**(`doc`, `variables`): [`LabelDocument`](../interfaces/LabelDocument.md)

Defined in: [packages/core/src/template.ts:84](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/template.ts#L84)

Produce a new document with placeholders substituted. Deep-clones; does not
mutate the input. Only text content and barcode data are substituted.

## Parameters

### doc

[`LabelDocument`](../interfaces/LabelDocument.md)

### variables

`Record`\<`string`, `string`\>

## Returns

[`LabelDocument`](../interfaces/LabelDocument.md)
