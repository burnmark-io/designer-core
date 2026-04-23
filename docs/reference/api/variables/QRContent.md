[**@burnmark-io/designer-core**](../README.md)

***

[@burnmark-io/designer-core](../globals.md) / QRContent

# Variable: QRContent

> `const` **QRContent**: `object`

Defined in: [packages/core/src/qr-content.ts:31](https://github.com/burnmark-io/designer-core/blob/4e00ab002e4c2068b61e066bf4d265b07b30c871/packages/core/src/qr-content.ts#L31)

## Type Declaration

### email()

> **email**(`to`, `subject?`, `body?`): `string`

#### Parameters

##### to

`string`

##### subject?

`string`

##### body?

`string`

#### Returns

`string`

### geo()

> **geo**(`lat`, `lng`): `string`

#### Parameters

##### lat

`number`

##### lng

`number`

#### Returns

`string`

### phone()

> **phone**(`number`): `string`

#### Parameters

##### number

`string`

#### Returns

`string`

### sms()

> **sms**(`number`, `message?`): `string`

#### Parameters

##### number

`string`

##### message?

`string`

#### Returns

`string`

### text()

> **text**(`text`): `string`

#### Parameters

##### text

`string`

#### Returns

`string`

### url()

> **url**(`url`): `string`

#### Parameters

##### url

`string`

#### Returns

`string`

### vcard()

> **vcard**(`contact`): `string`

#### Parameters

##### contact

[`VCardContact`](../interfaces/VCardContact.md)

#### Returns

`string`

### wifi()

> **wifi**(`ssid`, `password`, `security?`): `string`

#### Parameters

##### ssid

`string`

##### password

`string`

##### security?

`"WPA"` \| `"WEP"` \| `"nopass"`

#### Returns

`string`
