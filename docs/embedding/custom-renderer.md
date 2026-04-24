# Embedding — custom renderer

> **Note.** There is no formal `Renderer` interface in the shipped core
> API. The actual extension point for rendering backends is the
> **canvas abstraction**: core probes `globalThis.OffscreenCanvas` at
> render time, and falls back to dynamically importing
> `@napi-rs/canvas` when `OffscreenCanvas` isn't available. Replacing
> or stubbing one of these is how you "swap the renderer".

This page covers three practical scenarios:

1. Pre-configuring `@napi-rs/canvas` with custom fonts before core
   uses it.
2. Stubbing `OffscreenCanvas` in a test environment for headless
   validation without pulling in the Node canvas peer.
3. Using `skia-canvas` or a similar drop-in replacement in
   environments where `@napi-rs/canvas` doesn't build (typically
   Alpine / musl images).

## When you'd reach for this

- **Server-side rendering in environments without Canvas.** Docker
  Alpine, AWS Lambda on Graviton, or any host where
  `@napi-rs/canvas`'s prebuilt binaries don't ship. `skia-canvas` is
  the usual substitute — a pure-native Skia wrapper that installs
  more broadly.
- **Unit tests in `happy-dom` or `jsdom`.** Neither ships
  `OffscreenCanvas`; mocking one is cheaper than spinning up a full
  headless browser.
- **Alternative rendering backends.** Rendering to `sharp` for SVG
  export, to `puppeteer` for print-preview screenshotting, or to any
  library that can accept a 2D canvas-shaped API.

This is an **advanced topic** — most users never touch it. If your
use case is the normal server-side render flow with Node.js 22+ on
glibc, the default `@napi-rs/canvas` peer dep is the answer.

## Pattern 1 — Pre-configure `@napi-rs/canvas` with custom fonts

Core only touches `@napi-rs/canvas`'s `GlobalFonts` when
`registerFont()` is called. If you have fonts you want to be
available even before the first render, import the package yourself
during application startup:

```ts
import { GlobalFonts } from '@napi-rs/canvas';
import { readFile } from 'node:fs/promises';

await Promise.all([
  readFile('./fonts/InterDisplay.woff2').then(bytes =>
    GlobalFonts.register(new Uint8Array(bytes), 'Inter Display'),
  ),
  readFile('./fonts/NotoSansCJK.otf').then(bytes =>
    GlobalFonts.register(new Uint8Array(bytes), 'Noto Sans CJK'),
  ),
]);

// Now any `TextObject.fontFamily === 'Inter Display'` renders correctly.
```

This is functionally equivalent to calling `registerFont()` from
core, but the timing — at startup, not inside a request handler —
keeps warmup costs out of your hot path.

## Pattern 2 — Stub `OffscreenCanvas` in tests

The binding packages (`@burnmark-io/designer-vue`,
`@burnmark-io/designer-react`) run their tests under `happy-dom`,
which doesn't have `OffscreenCanvas`. Rather than bring in
`@napi-rs/canvas` as a test dep, those suites mock the render methods
on the designer directly:

```ts
import { vi } from 'vitest';
import { LabelDesigner } from '@burnmark-io/designer-core';

function stubBitmap(width = 10, height = 10) {
  return {
    widthPx: width,
    heightPx: height,
    data: new Uint8Array(Math.ceil(width / 8) * height),
  };
}

const designer = new LabelDesigner();
const renderToBitmap = vi.spyOn(designer, 'renderToBitmap');
renderToBitmap.mockResolvedValue(stubBitmap());
```

This is the right call in unit tests — you're verifying event wiring,
debouncing, selection pruning, not the render pipeline itself. Core's
own test suite exercises the real pipeline.

If you need a more complete stub that satisfies deeper paths through
core, inject a mock `OffscreenCanvas` onto `globalThis` before
importing the package:

```ts
const mockCanvas = {
  getContext: () => ({
    fillRect: () => {},
    drawImage: () => {},
    getImageData: () => ({
      width: 10,
      height: 10,
      data: new Uint8ClampedArray(10 * 10 * 4),
    }),
    putImageData: () => {},
    /* …other 2D context methods as needed by your test scope… */
  }),
  convertToBlob: async () => new Blob([new Uint8Array()], { type: 'image/png' }),
};

(globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = function (_w: number, _h: number) {
  return mockCanvas;
};
```

Reach for this only when the full pipeline needs to run — most tests
don't. Keep the stubs as narrow as possible; every method you fake is
a coupling between your test and core's internals.

## Pattern 3 — `skia-canvas` in place of `@napi-rs/canvas`

[`skia-canvas`](https://github.com/samizdatco/skia-canvas) exports a
compatible-enough 2D canvas API and has broader build coverage
(Alpine, musl, some Graviton configurations). Use it when
`@napi-rs/canvas` fails to install.

Core's canvas abstraction lives in `packages/core/src/render/canvas.ts`
and only imports `@napi-rs/canvas`. There's no public knob to swap the
import today; the options are:

- **Prefer the browser path.** If `globalThis.OffscreenCanvas` is
  defined, core uses it regardless of Node.js being present. In an
  environment where `skia-canvas` provides an `OffscreenCanvas`
  polyfill, set it on `globalThis` at startup:

  ```ts
  import { Canvas, loadImage } from 'skia-canvas';

  // Not every version of skia-canvas exposes OffscreenCanvas — check your edition.
  if (!(globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas) {
    (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = class OffscreenCanvasShim {
      constructor(width: number, height: number) {
        return new Canvas(width, height);
      }
    };
  }
  ```

  Core's renderer probes `OffscreenCanvas` first and will pick up the
  shim without any other changes.

- **Fork the canvas module.** If `skia-canvas`'s API differs from
  `@napi-rs/canvas` in a way the shim can't bridge, fork
  `packages/core/src/render/canvas.ts`, swap the import, and publish
  a replacement under your namespace. The surface is small — one
  file, <100 lines.

- **Render on a different process.** Spawn a worker that has
  `@napi-rs/canvas` installed and send rendering work to it via IPC
  or a local HTTP endpoint. This keeps your main service on
  Alpine/Graviton and moves the canvas requirement to a helper
  image. Core's `Blob`-based `exportPng` output travels across
  process boundaries cleanly.

## Non-Canvas backends — a note on scope

Retargeting the entire pipeline to a non-Canvas library (SVG-first,
pure-native text layout, etc.) is not supported today. The text,
shape, and image rendering all use Canvas 2D primitives
(`fillText`, `drawImage`, `clip`, path building). A backend that
doesn't support those would need to be implemented in terms of them
— the canvas-emulation route above — rather than parallel to them.

If you're thinking about a genuinely alternative backend (e.g. a
Flutter or a native GPU path), the best starting point is the
render pipeline overview in [Rendering](/guide/rendering) — core's
render flow is small enough that a clean reimplementation in a
different medium is tractable, though outside the scope of the
shipped package.
