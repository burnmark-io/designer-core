[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / parseCsv

# Function: parseCsv()

> **parseCsv**(`input`): `Promise`\<[`CsvData`](../interfaces/CsvData.md)\>

Defined in: [packages/core/src/csv.ts:20](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/csv.ts#L20)

Parse CSV content into headers and rows. Accepts plain strings, byte
buffers, or `Blob`/`File` objects. Uses Papaparse under the hood.

- Trims header names.
- Skips fully empty rows.
- Quoted fields, escaped quotes, and configurable delimiters are handled
  by Papaparse.

## Parameters

### input

[`CsvInput`](../type-aliases/CsvInput.md)

## Returns

`Promise`\<[`CsvData`](../interfaces/CsvData.md)\>
