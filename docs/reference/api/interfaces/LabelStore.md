[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / LabelStore

# Interface: LabelStore

Defined in: [packages/core/src/printer.ts:46](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/printer.ts#L46)

Storage for label documents. Implementations: IndexedDB (browser apps),
filesystem (CLI/scripts), cloud stores.

## Methods

### delete()

> **delete**(`id`): `Promise`\<`void`\>

Defined in: [packages/core/src/printer.ts:50](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/printer.ts#L50)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### list()

> **list**(): `Promise`\<[`LabelSummary`](LabelSummary.md)[]\>

Defined in: [packages/core/src/printer.ts:49](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/printer.ts#L49)

#### Returns

`Promise`\<[`LabelSummary`](LabelSummary.md)[]\>

***

### load()

> **load**(`id`): `Promise`\<[`LabelDocument`](LabelDocument.md)\>

Defined in: [packages/core/src/printer.ts:48](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/printer.ts#L48)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`LabelDocument`](LabelDocument.md)\>

***

### save()

> **save**(`doc`): `Promise`\<`void`\>

Defined in: [packages/core/src/printer.ts:47](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/printer.ts#L47)

#### Parameters

##### doc

[`LabelDocument`](LabelDocument.md)

#### Returns

`Promise`\<`void`\>
