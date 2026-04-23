[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / matchColourToPlane

# Function: matchColourToPlane()

> **matchColourToPlane**(`objectColor`, `capabilities`): `string`

Defined in: [packages/core/src/render/colour.ts:38](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/render/colour.ts#L38)

Map an object colour to a printer plane by explicit matching only. No RGB
heuristics. If the colour is listed in a plane's `cssMatch` array, that
plane wins. Otherwise the wildcard plane (`'*'`) is the default.

First non-wildcard match wins, in the order `capabilities.colors` is
declared. If no non-wildcard plane matches, the first plane with `'*'`
in its `cssMatch` is used.

## Parameters

### objectColor

`string`

### capabilities

[`PrinterCapabilities`](../interfaces/PrinterCapabilities.md)

## Returns

`string`
