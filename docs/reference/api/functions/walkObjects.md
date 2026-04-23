[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / walkObjects

# Function: walkObjects()

> **walkObjects**(`objects`): `Generator`\<[`LabelObject`](../type-aliases/LabelObject.md)\>

Defined in: [packages/core/src/objects.ts:93](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/objects.ts#L93)

Walk a document's objects recursively (descending into groups).
Yields every object exactly once, including the group itself.

## Parameters

### objects

[`LabelObject`](../type-aliases/LabelObject.md)[]

## Returns

`Generator`\<[`LabelObject`](../type-aliases/LabelObject.md)\>
