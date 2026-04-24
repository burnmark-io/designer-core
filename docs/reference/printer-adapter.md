# `PrinterAdapter`

designer-core is vendor-neutral. It does not ship drivers for any
specific printer. Instead it defines the `PrinterAdapter` interface
that driver packages conform to — `@thermal-label/brother-ql-node`,
`@thermal-label/labelwriter-node`,
`@thermal-label/labelmanager-node`, and any third-party drivers you or
someone else writes.

This page documents the interface, the related capability types, and
the recipe for implementing a new driver.

## The interface

```ts
import { type PrinterAdapter } from '@burnmark-io/designer-core';
```

```ts
interface PrinterAdapter {
  readonly family: string;                   // 'brother-ql', 'labelmanager', 'labelwriter', …
  readonly model: string;                    // specific model, e.g. 'QL-800'
  readonly connected: boolean;               // transport state
  readonly capabilities: PrinterCapabilities;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): Promise<PrinterStatus>;
  print(planes: Map<string, LabelBitmap>, options?: PrintOptions): Promise<void>;
}
```

Driver packages export a `createAdapter(url: string)` factory that
returns a `PrinterAdapter` instance. The CLI and your own code reach
for adapters via URL — `usb://brother-ql`, `tcp://192.168.1.42`,
`bluetooth://dymo-labelmanager` — and the driver picks them up based on
scheme and family.

## `PrinterCapabilities`

```ts
interface PrinterCapabilities {
  colors: PrinterColor[];
}

interface PrinterColor {
  name: string;         // plane name — 'black', 'red', 'cyan', …
  cssMatch: string[];   // exact CSS colour strings; or ['*'] for wildcard
}
```

Every adapter declares its capabilities as a static property — single
colour for most thermal printers, two-colour for Brother QL800/820/…
on DK-22251 tape, and so on. The render pipeline (`renderPlanes(caps)`)
uses this to partition document objects into per-plane canvases and
returns a `Map<planeName, LabelBitmap>` matching it. See
[Colour model](/guide/colour-model) for the full matching rules.

### Presets

```ts
import { SINGLE_COLOR, TWO_COLOR_BLACK_RED } from '@burnmark-io/designer-core';
```

- `SINGLE_COLOR` — one wildcard `'black'` plane.
- `TWO_COLOR_BLACK_RED` — a black wildcard plane plus a red plane that
  matches common CSS red variants.

Drivers for single-colour hardware should export `SINGLE_COLOR` from
core directly; drivers for two-colour hardware usually extend
`TWO_COLOR_BLACK_RED` if they recognise additional aliases.

## `PrinterStatus`

```ts
interface PrinterStatus {
  ready: boolean;                // true if the printer is idle and reachable
  mediaLoaded: boolean;          // tape present?
  mediaWidthMm?: number;         // detected media width
  mediaType?: string;            // 'DK-22251', '4XL', …
  errors: string[];              // empty when healthy
}
```

Call `getStatus()` before a batch print if you care about paper jams,
missing media, or mismatched tape widths. Drivers are expected to
re-probe the wire on every call — it's fine to be chatty, Brother QL
status packets are small.

## `PrintOptions`

```ts
interface PrintOptions {
  density?: 'light' | 'normal' | 'dark';
  copies?: number;
}
```

Passed as the second argument to `adapter.print()`. Drivers are free
to ignore settings they can't honour — a DYMO LabelWriter has no
density selector, so `density: 'dark'` is simply dropped. Copies above
the hardware's supported batch size are handled by the driver (most
common approach: iterate internally).

## How a render call feeds into `print()`

```
LabelDocument
    │
    │  designer.renderPlanes(adapter.capabilities)
    ▼
Map<planeName, LabelBitmap>                 // from @mbtech-nl/bitmap
    │
    │  adapter.print(planes, { density: 'normal' })
    ▼
printer wire format
```

The driver receives one `LabelBitmap` per plane its capabilities
declare. Extras (a driver that only knows `'black'` receives a map
with `'red'` as well) should be ignored, not an error — that keeps the
render code path identical whether the adapter is single- or
two-colour.

A `LabelBitmap` is:

```ts
interface LabelBitmap {
  widthPx: number;
  heightPx: number;
  data: Uint8Array;       // packed 1bpp, MSB-first per byte
}
```

Row stride is `Math.ceil(widthPx / 8)` bytes. A set bit means "print
this pixel".

## Implementing a new driver

Say you have a printer that speaks a proprietary TCP protocol. Here's
the skeleton:

```ts
import {
  type PrinterAdapter,
  type PrinterCapabilities,
  type PrinterStatus,
  type PrintOptions,
  SINGLE_COLOR,
} from '@burnmark-io/designer-core';
import { type LabelBitmap } from '@mbtech-nl/bitmap';

export class MyThermalAdapter implements PrinterAdapter {
  readonly family = 'mythermal';
  readonly model: string;
  readonly capabilities: PrinterCapabilities = SINGLE_COLOR;

  private socket: Socket | null = null;

  constructor(model: string, private readonly host: string) {
    this.model = model;
  }

  get connected(): boolean {
    return this.socket !== null && !this.socket.destroyed;
  }

  async connect(): Promise<void> {
    this.socket = await openTcpSocket(this.host, 9100);
  }

  async disconnect(): Promise<void> {
    this.socket?.end();
    this.socket = null;
  }

  async getStatus(): Promise<PrinterStatus> {
    const res = await this.sendCommand('STATUS');
    return parseStatus(res);
  }

  async print(
    planes: Map<string, LabelBitmap>,
    options: PrintOptions = {},
  ): Promise<void> {
    const black = planes.get('black');
    if (!black) throw new Error('mythermal: no black plane produced');
    const job = buildJob(black, options);
    await this.sendCommand(job);
  }

  private async sendCommand(data: string | Uint8Array): Promise<Uint8Array> {
    /* wire protocol */
  }
}

export function createAdapter(url: string): PrinterAdapter {
  // url: mythermal://192.168.1.42  — your choice of scheme.
  const { host, model } = parseUrl(url);
  return new MyThermalAdapter(model ?? 'generic', host);
}
```

### Expected package layout

Driver packages are discovered by `burnmark-cli` via hardcoded package
names. To participate, your package should:

1. Be named `@thermal-label/<family>-node` (or follow your own naming —
   you'll wire it into the CLI manually if not).
2. Export a top-level `createAdapter(url: string) => PrinterAdapter`
   factory.
3. Declare `@burnmark-io/designer-core` in its `peerDependencies`.
4. Stay pure in ESM — `burnmark-cli` imports drivers dynamically via
   `import(packageName)`.

### Status reporting discipline

- Return `ready: false` if the printer is mid-print. Fast-follow prints
  that overlap a cut cycle on a Brother QL produce "motor busy" errors
  that are invisible in `errors`.
- Populate `mediaWidthMm` when possible. Applications use it to warn
  before a batch runs with the wrong tape.
- Populate `errors` with human-readable strings, not error codes.
  "Cover open" beats `0x04`. The CLI surfaces these verbatim.

### `@thermal-label/*` drivers as reference implementations

The `@thermal-label/*` packages ship as the canonical reference:

- [`@thermal-label/brother-ql-node`](https://github.com/mannes-brak/thermal-label/tree/main/packages/brother-ql-node)
  — USB (via `node-hid`) and TCP; single- and two-colour QL models;
  continuous and DK die-cut media.
- [`@thermal-label/labelwriter-node`](https://github.com/mannes-brak/thermal-label/tree/main/packages/labelwriter-node)
  — DYMO LabelWriter over USB. Single colour, fixed media widths.
- [`@thermal-label/labelmanager-node`](https://github.com/mannes-brak/thermal-label/tree/main/packages/labelmanager-node)
  — DYMO LabelManager via the legacy serial protocol.

Start by reading the brother-ql-node adapter if you're implementing a
modern thermal protocol; start with labelmanager-node if you're
dealing with a legacy serial/Bluetooth protocol.
