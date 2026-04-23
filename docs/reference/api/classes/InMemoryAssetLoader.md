[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / InMemoryAssetLoader

# Class: InMemoryAssetLoader

Defined in: [packages/core/src/assets.ts:17](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/assets.ts#L17)

Simple in-memory asset store. Keys are stable sha1-ish hashes of content.

## Implements

- [`AssetLoader`](../interfaces/AssetLoader.md)

## Constructors

### Constructor

> **new InMemoryAssetLoader**(): `InMemoryAssetLoader`

#### Returns

`InMemoryAssetLoader`

## Methods

### has()

> **has**(`key`): `Promise`\<`boolean`\>

Defined in: [packages/core/src/assets.ts:33](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/assets.ts#L33)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

[`AssetLoader`](../interfaces/AssetLoader.md).[`has`](../interfaces/AssetLoader.md#has)

***

### load()

> **load**(`key`): `Promise`\<`Uint8Array`\>

Defined in: [packages/core/src/assets.ts:20](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/assets.ts#L20)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`Uint8Array`\>

#### Implementation of

[`AssetLoader`](../interfaces/AssetLoader.md).[`load`](../interfaces/AssetLoader.md#load)

***

### set()

> **set**(`key`, `data`): `void`

Defined in: [packages/core/src/assets.ts:37](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/assets.ts#L37)

#### Parameters

##### key

`string`

##### data

`Uint8Array`

#### Returns

`void`

***

### store()

> **store**(`data`): `Promise`\<`string`\>

Defined in: [packages/core/src/assets.ts:26](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/assets.ts#L26)

#### Parameters

##### data

`Uint8Array` \| `ArrayBuffer`

#### Returns

`Promise`\<`string`\>

#### Implementation of

[`AssetLoader`](../interfaces/AssetLoader.md).[`store`](../interfaces/AssetLoader.md#store)
