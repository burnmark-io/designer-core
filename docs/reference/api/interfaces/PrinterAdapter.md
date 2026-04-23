[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / PrinterAdapter

# Interface: PrinterAdapter

Defined in: [packages/core/src/printer.ts:17](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/printer.ts#L17)

Printer adapter — implemented by vendor driver packages (e.g.
`@thermal-label/labelmanager-node`, `@thermal-label/brother-ql-node`).

Core defines the interface; drivers provide transport (USB, TCP/IP,
Bluetooth) and the wire-format conversion for a given printer family.

The `print` method accepts `Map<string, LabelBitmap>` — one entry per
plane in the driver's `capabilities`. For single-colour printers the
map has one entry (e.g. `'black'`); for two-colour, two. Drivers extract
the planes they know about and ignore any extras.

## Properties

### capabilities

> `readonly` **capabilities**: [`PrinterCapabilities`](PrinterCapabilities.md)

Defined in: [packages/core/src/printer.ts:21](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/printer.ts#L21)

***

### connected

> `readonly` **connected**: `boolean`

Defined in: [packages/core/src/printer.ts:20](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/printer.ts#L20)

***

### family

> `readonly` **family**: `string`

Defined in: [packages/core/src/printer.ts:18](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/printer.ts#L18)

***

### model

> `readonly` **model**: `string`

Defined in: [packages/core/src/printer.ts:19](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/printer.ts#L19)

## Methods

### connect()

> **connect**(): `Promise`\<`void`\>

Defined in: [packages/core/src/printer.ts:23](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/printer.ts#L23)

#### Returns

`Promise`\<`void`\>

***

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Defined in: [packages/core/src/printer.ts:24](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/printer.ts#L24)

#### Returns

`Promise`\<`void`\>

***

### getStatus()

> **getStatus**(): `Promise`\<[`PrinterStatus`](PrinterStatus.md)\>

Defined in: [packages/core/src/printer.ts:25](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/printer.ts#L25)

#### Returns

`Promise`\<[`PrinterStatus`](PrinterStatus.md)\>

***

### print()

> **print**(`planes`, `options?`): `Promise`\<`void`\>

Defined in: [packages/core/src/printer.ts:26](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/printer.ts#L26)

#### Parameters

##### planes

`Map`\<`string`, [`LabelBitmap`](LabelBitmap.md)\>

##### options?

[`PrintOptions`](PrintOptions.md)

#### Returns

`Promise`\<`void`\>
