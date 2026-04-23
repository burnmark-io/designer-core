[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / AssetStore

# Interface: AssetStore

Defined in: [packages/core/src/printer.ts:68](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/printer.ts#L68)

Storage for binary assets (images). Mirrors the `AssetLoader` interface
but sits at the application persistence layer rather than the render
loader. A single implementation often satisfies both interfaces.

## Methods

### delete()

> **delete**(`key`): `Promise`\<`void`\>

Defined in: [packages/core/src/printer.ts:71](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/printer.ts#L71)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

***

### load()

> **load**(`key`): `Promise`\<`Uint8Array`\>

Defined in: [packages/core/src/printer.ts:70](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/printer.ts#L70)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`Uint8Array`\>

***

### store()

> **store**(`data`, `mimeType`): `Promise`\<`string`\>

Defined in: [packages/core/src/printer.ts:69](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/printer.ts#L69)

#### Parameters

##### data

`Uint8Array` \| `ArrayBuffer`

##### mimeType

`string`

#### Returns

`Promise`\<`string`\>
