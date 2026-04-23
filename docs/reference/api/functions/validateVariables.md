[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / validateVariables

# Function: validateVariables()

> **validateVariables**(`doc`, `variables`): [`ValidationResult`](../interfaces/ValidationResult.md)

Defined in: [packages/core/src/template.ts:49](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/template.ts#L49)

Check a set of variables against the placeholders referenced by a document.
Reports missing (referenced but not supplied), unused (supplied but not
referenced), and any warnings.

## Parameters

### doc

[`LabelDocument`](../interfaces/LabelDocument.md)

### variables

`Record`\<`string`, `string`\>

## Returns

[`ValidationResult`](../interfaces/ValidationResult.md)
