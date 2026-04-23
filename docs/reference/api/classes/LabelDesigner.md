[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / LabelDesigner

# Class: LabelDesigner

Defined in: [packages/core/src/designer.ts:37](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L37)

Main entry point for the label designer. Manages document state,
history, and (in later steps) rendering.

Selection is NOT managed here — it's UI state and belongs in the
framework binding layer (Vue composable, React hook, application code).

## Constructors

### Constructor

> **new LabelDesigner**(`options?`): `LabelDesigner`

Defined in: [packages/core/src/designer.ts:43](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L43)

#### Parameters

##### options?

[`DesignerOptions`](../interfaces/DesignerOptions.md) = `{}`

#### Returns

`LabelDesigner`

## Properties

### assetLoader

> `readonly` **assetLoader**: [`AssetLoader`](../interfaces/AssetLoader.md)

Defined in: [packages/core/src/designer.ts:41](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L41)

## Accessors

### canRedo

#### Get Signature

> **get** **canRedo**(): `boolean`

Defined in: [packages/core/src/designer.ts:194](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L194)

##### Returns

`boolean`

***

### canUndo

#### Get Signature

> **get** **canUndo**(): `boolean`

Defined in: [packages/core/src/designer.ts:190](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L190)

##### Returns

`boolean`

***

### document

#### Get Signature

> **get** **document**(): [`LabelDocument`](../interfaces/LabelDocument.md)

Defined in: [packages/core/src/designer.ts:58](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L58)

The current document state. Do NOT mutate directly — use
[add](#add)/[update](#update)/[remove](#remove)/[setCanvas](#setcanvas) which track
history. Returned object is the live snapshot; mutations are not
enforced against.

##### Returns

[`LabelDocument`](../interfaces/LabelDocument.md)

## Methods

### add()

> **add**(`object`): `string`

Defined in: [packages/core/src/designer.ts:89](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L89)

#### Parameters

##### object

[`LabelObjectInput`](../type-aliases/LabelObjectInput.md)

#### Returns

`string`

***

### applyVariables()

> **applyVariables**(`variables`): [`LabelDocument`](../interfaces/LabelDocument.md)

Defined in: [packages/core/src/designer.ts:249](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L249)

#### Parameters

##### variables

`Record`\<`string`, `string`\>

#### Returns

[`LabelDocument`](../interfaces/LabelDocument.md)

***

### clearHistory()

> **clearHistory**(): `void`

Defined in: [packages/core/src/designer.ts:198](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L198)

#### Returns

`void`

***

### fromJSON()

> **fromJSON**(`json`): `void`

Defined in: [packages/core/src/designer.ts:83](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L83)

#### Parameters

##### json

`string`

#### Returns

`void`

***

### get()

> **get**(`id`): [`LabelObject`](../type-aliases/LabelObject.md) \| `undefined`

Defined in: [packages/core/src/designer.ts:153](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L153)

#### Parameters

##### id

`string`

#### Returns

[`LabelObject`](../type-aliases/LabelObject.md) \| `undefined`

***

### getAll()

> **getAll**(): [`LabelObject`](../type-aliases/LabelObject.md)[]

Defined in: [packages/core/src/designer.ts:160](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L160)

#### Returns

[`LabelObject`](../type-aliases/LabelObject.md)[]

***

### getPlaceholders()

> **getPlaceholders**(): `string`[]

Defined in: [packages/core/src/designer.ts:245](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L245)

#### Returns

`string`[]

***

### loadDocument()

> **loadDocument**(`doc`): `void`

Defined in: [packages/core/src/designer.ts:62](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L62)

#### Parameters

##### doc

[`LabelDocument`](../interfaces/LabelDocument.md)

#### Returns

`void`

***

### newDocument()

> **newDocument**(`canvas?`, `name?`): `void`

Defined in: [packages/core/src/designer.ts:71](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L71)

#### Parameters

##### canvas?

`Partial`\<[`CanvasConfig`](../interfaces/CanvasConfig.md)\> = `{}`

##### name?

`string`

#### Returns

`void`

***

### off()

> **off**(`event`, `handler`): `void`

Defined in: [packages/core/src/designer.ts:210](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L210)

#### Parameters

##### event

[`DesignerEvent`](../type-aliases/DesignerEvent.md)

##### handler

[`EventHandler`](../type-aliases/EventHandler.md)

#### Returns

`void`

***

### on()

> **on**(`event`, `handler`): () => `void`

Defined in: [packages/core/src/designer.ts:206](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L206)

#### Parameters

##### event

[`DesignerEvent`](../type-aliases/DesignerEvent.md)

##### handler

[`EventHandler`](../type-aliases/EventHandler.md)

#### Returns

() => `void`

***

### redo()

> **redo**(): `void`

Defined in: [packages/core/src/designer.ts:182](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L182)

#### Returns

`void`

***

### remove()

> **remove**(`id`): `void`

Defined in: [packages/core/src/designer.ts:110](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L110)

#### Parameters

##### id

`string`

#### Returns

`void`

***

### render()

> **render**(`variables?`): `Promise`\<[`RawImageData`](../interfaces/RawImageData.md)\>

Defined in: [packages/core/src/designer.ts:217](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L217)

Full-colour RGBA render of the document. No 1bpp conversion.

#### Parameters

##### variables?

`Record`\<`string`, `string`\>

#### Returns

`Promise`\<[`RawImageData`](../interfaces/RawImageData.md)\>

***

### renderBatch()

> **renderBatch**(`rows`, `capabilities?`): `AsyncGenerator`\<[`BatchResult`](../interfaces/BatchResult.md)\>

Defined in: [packages/core/src/designer.ts:277](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L277)

Render a batch of labels from CSV rows, one per row. Yields each
`BatchResult` so the consumer can print it and let it be garbage
collected before the next is produced.

#### Parameters

##### rows

`Record`\<`string`, `string`\>[]

##### capabilities?

[`PrinterCapabilities`](../interfaces/PrinterCapabilities.md)

#### Returns

`AsyncGenerator`\<[`BatchResult`](../interfaces/BatchResult.md)\>

***

### renderPlanes()

> **renderPlanes**(`capabilities`, `variables?`): `Promise`\<`Map`\<`string`, [`LabelBitmap`](../interfaces/LabelBitmap.md)\>\>

Defined in: [packages/core/src/designer.ts:233](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L233)

Multi-plane 1bpp render per printer capability set.

#### Parameters

##### capabilities

[`PrinterCapabilities`](../interfaces/PrinterCapabilities.md)

##### variables?

`Record`\<`string`, `string`\>

#### Returns

`Promise`\<`Map`\<`string`, [`LabelBitmap`](../interfaces/LabelBitmap.md)\>\>

***

### renderToBitmap()

> **renderToBitmap**(`variables?`): `Promise`\<[`LabelBitmap`](../interfaces/LabelBitmap.md)\>

Defined in: [packages/core/src/designer.ts:225](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L225)

Single-plane 1bpp render. All objects → black.

#### Parameters

##### variables?

`Record`\<`string`, `string`\>

#### Returns

`Promise`\<[`LabelBitmap`](../interfaces/LabelBitmap.md)\>

***

### reorder()

> **reorder**(`id`, `direction`): `void`

Defined in: [packages/core/src/designer.ts:117](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L117)

#### Parameters

##### id

`string`

##### direction

[`ReorderDirection`](../type-aliases/ReorderDirection.md)

#### Returns

`void`

***

### setCanvas()

> **setCanvas**(`patch`): `void`

Defined in: [packages/core/src/designer.ts:166](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L166)

#### Parameters

##### patch

`Partial`\<[`CanvasConfig`](../interfaces/CanvasConfig.md)\>

#### Returns

`void`

***

### toJSON()

> **toJSON**(): `string`

Defined in: [packages/core/src/designer.ts:79](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L79)

#### Returns

`string`

***

### undo()

> **undo**(): `void`

Defined in: [packages/core/src/designer.ts:174](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L174)

#### Returns

`void`

***

### update()

> **update**(`id`, `patch`): `void`

Defined in: [packages/core/src/designer.ts:98](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L98)

#### Parameters

##### id

`string`

##### patch

`Partial`\<[`LabelObject`](../type-aliases/LabelObject.md)\>

#### Returns

`void`

***

### toBitmap()

> `static` **toBitmap**(`rgba`, `options?`): [`LabelBitmap`](../interfaces/LabelBitmap.md)

Defined in: [packages/core/src/designer.ts:265](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/designer.ts#L265)

Expose `toBitmap` for callers who already have RGBA pixels.

#### Parameters

##### rgba

[`RawImageData`](../interfaces/RawImageData.md)

##### options?

###### dither?

`boolean`

###### invert?

`boolean`

###### threshold?

`number`

#### Returns

[`LabelBitmap`](../interfaces/LabelBitmap.md)
