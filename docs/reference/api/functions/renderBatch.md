[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / renderBatch

# Function: renderBatch()

> **renderBatch**(`designer`, `rows`, `capabilities?`): `AsyncGenerator`\<[`BatchResult`](../interfaces/BatchResult.md)\>

Defined in: [packages/core/src/batch.ts:20](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/batch.ts#L20)

Render a batch of labels from CSV rows. Memory-efficient: each label is
rendered on demand and yielded, so the consumer can print/save/GC it
before the next one is produced.

If `capabilities` is omitted, defaults to `SINGLE_COLOR` — one `'black'`
plane per yielded result.

## Parameters

### designer

[`LabelDesigner`](../classes/LabelDesigner.md)

### rows

`Record`\<`string`, `string`\>[]

### capabilities?

[`PrinterCapabilities`](../interfaces/PrinterCapabilities.md) = `SINGLE_COLOR`

## Returns

`AsyncGenerator`\<[`BatchResult`](../interfaces/BatchResult.md)\>
