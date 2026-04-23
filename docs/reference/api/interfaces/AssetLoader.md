[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / AssetLoader

# Interface: AssetLoader

Defined in: [packages/core/src/assets.ts:10](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/assets.ts#L10)

Asset loader interface and in-memory default implementation.

The design model stores images by `assetKey` — a content-addressed key
into an asset store. Consuming apps are free to back this with IndexedDB,
the filesystem, S3, or anything else. The in-memory implementation is
convenient for scripts and tests.

## Methods

### has()

> **has**(`key`): `Promise`\<`boolean`\>

Defined in: [packages/core/src/assets.ts:13](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/assets.ts#L13)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`boolean`\>

***

### load()

> **load**(`key`): `Promise`\<`Uint8Array`\>

Defined in: [packages/core/src/assets.ts:11](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/assets.ts#L11)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`Uint8Array`\>

***

### store()

> **store**(`data`): `Promise`\<`string`\>

Defined in: [packages/core/src/assets.ts:12](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/assets.ts#L12)

#### Parameters

##### data

`Uint8Array` \| `ArrayBuffer`

#### Returns

`Promise`\<`string`\>
