[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / FontLoader

# Interface: FontLoader

Defined in: [packages/core/src/fonts.ts:35](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/fonts.ts#L35)

## Methods

### isLoaded()

> **isLoaded**(`family`): `boolean`

Defined in: [packages/core/src/fonts.ts:38](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/fonts.ts#L38)

#### Parameters

##### family

`string`

#### Returns

`boolean`

***

### listLoaded()

> **listLoaded**(): [`FontDescriptor`](FontDescriptor.md)[]

Defined in: [packages/core/src/fonts.ts:39](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/fonts.ts#L39)

#### Returns

[`FontDescriptor`](FontDescriptor.md)[]

***

### load()

> **load**(`family`): `Promise`\<`void`\>

Defined in: [packages/core/src/fonts.ts:36](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/fonts.ts#L36)

#### Parameters

##### family

`string`

#### Returns

`Promise`\<`void`\>

***

### register()

> **register**(`family`, `source`): `Promise`\<`void`\>

Defined in: [packages/core/src/fonts.ts:37](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/fonts.ts#L37)

#### Parameters

##### family

`string`

##### source

`string` \| `Uint8Array` \| `ArrayBuffer`

#### Returns

`Promise`\<`void`\>
