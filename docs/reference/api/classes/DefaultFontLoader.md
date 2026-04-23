[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / DefaultFontLoader

# Class: DefaultFontLoader

Defined in: [packages/core/src/fonts.ts:48](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/fonts.ts#L48)

Default FontLoader. Uses the Font Loading API in browsers and
`@napi-rs/canvas`'s GlobalFonts in Node.js. Unknown families emit a
warning via the supplied `warn` callback (if any) and are treated as a
fallback to the first bundled sans family.

## Implements

- [`FontLoader`](../interfaces/FontLoader.md)

## Constructors

### Constructor

> **new DefaultFontLoader**(`warn?`): `DefaultFontLoader`

Defined in: [packages/core/src/fonts.ts:52](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/fonts.ts#L52)

#### Parameters

##### warn?

(`family`, `reason`) => `void`

#### Returns

`DefaultFontLoader`

## Methods

### isLoaded()

> **isLoaded**(`family`): `boolean`

Defined in: [packages/core/src/fonts.ts:110](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/fonts.ts#L110)

#### Parameters

##### family

`string`

#### Returns

`boolean`

#### Implementation of

[`FontLoader`](../interfaces/FontLoader.md).[`isLoaded`](../interfaces/FontLoader.md#isloaded)

***

### listLoaded()

> **listLoaded**(): [`FontDescriptor`](../interfaces/FontDescriptor.md)[]

Defined in: [packages/core/src/fonts.ts:114](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/fonts.ts#L114)

#### Returns

[`FontDescriptor`](../interfaces/FontDescriptor.md)[]

#### Implementation of

[`FontLoader`](../interfaces/FontLoader.md).[`listLoaded`](../interfaces/FontLoader.md#listloaded)

***

### load()

> **load**(`family`): `Promise`\<`void`\>

Defined in: [packages/core/src/fonts.ts:89](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/fonts.ts#L89)

#### Parameters

##### family

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`FontLoader`](../interfaces/FontLoader.md).[`load`](../interfaces/FontLoader.md#load)

***

### register()

> **register**(`family`, `source`): `Promise`\<`void`\>

Defined in: [packages/core/src/fonts.ts:60](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/fonts.ts#L60)

#### Parameters

##### family

`string`

##### source

`string` \| `Uint8Array` \| `ArrayBuffer`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`FontLoader`](../interfaces/FontLoader.md).[`register`](../interfaces/FontLoader.md#register)
