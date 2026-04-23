[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / History

# Class: History

Defined in: [packages/core/src/history.ts:10](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/history.ts#L10)

Undo/redo history for label documents.

Stores full document snapshots. Cloning uses `structuredClone` which is a
native deep-clone in Node 17+ and all supported browsers. Snapshots are
independent — mutating one has no effect on another.

## Constructors

### Constructor

> **new History**(`maxDepth?`): `History`

Defined in: [packages/core/src/history.ts:14](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/history.ts#L14)

#### Parameters

##### maxDepth?

`number` = `100`

#### Returns

`History`

## Accessors

### canRedo

#### Get Signature

> **get** **canRedo**(): `boolean`

Defined in: [packages/core/src/history.ts:47](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/history.ts#L47)

##### Returns

`boolean`

***

### canUndo

#### Get Signature

> **get** **canUndo**(): `boolean`

Defined in: [packages/core/src/history.ts:43](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/history.ts#L43)

##### Returns

`boolean`

***

### size

#### Get Signature

> **get** **size**(): `number`

Defined in: [packages/core/src/history.ts:56](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/history.ts#L56)

##### Returns

`number`

## Methods

### clear()

> **clear**(): `void`

Defined in: [packages/core/src/history.ts:51](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/history.ts#L51)

#### Returns

`void`

***

### push()

> **push**(`doc`): `void`

Defined in: [packages/core/src/history.ts:16](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/history.ts#L16)

#### Parameters

##### doc

[`LabelDocument`](../interfaces/LabelDocument.md)

#### Returns

`void`

***

### redo()

> **redo**(): [`LabelDocument`](../interfaces/LabelDocument.md) \| `undefined`

Defined in: [packages/core/src/history.ts:36](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/history.ts#L36)

#### Returns

[`LabelDocument`](../interfaces/LabelDocument.md) \| `undefined`

***

### undo()

> **undo**(): [`LabelDocument`](../interfaces/LabelDocument.md) \| `undefined`

Defined in: [packages/core/src/history.ts:29](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/history.ts#L29)

#### Returns

[`LabelDocument`](../interfaces/LabelDocument.md) \| `undefined`
