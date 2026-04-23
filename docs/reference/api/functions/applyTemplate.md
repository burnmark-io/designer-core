[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / applyTemplate

# Function: applyTemplate()

> **applyTemplate**(`template`, `variables`): `string`

Defined in: [packages/core/src/template.ts:12](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/template.ts#L12)

Substitute `{{placeholder}}` tokens in `template` with values from
`variables`. Case-insensitive lookup, whitespace around keys is trimmed.
Unknown placeholders are left as-is (rendered literally).

## Parameters

### template

`string`

### variables

`Record`\<`string`, `string`\>

## Returns

`string`
