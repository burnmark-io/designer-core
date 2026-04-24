# Document model

A `LabelDocument` is a plain JSON-shaped object — no classes, no closures —
that describes a label's canvas and its objects. It is the single piece of
state managed by `LabelDesigner`, serialised to `.label` files, migrated
forward across schema versions, and fed to the render pipeline.

```ts
import { type LabelDocument, type CanvasConfig } from '@burnmark-io/designer-core';
```

## `LabelDocument`

```ts
interface LabelDocument {
  id: string;
  version: number;            // matches CURRENT_DOCUMENT_VERSION when loaded
  name: string;
  description?: string;
  createdAt: string;          // ISO-8601
  updatedAt: string;          // ISO-8601 — updated on every mutation
  canvas: CanvasConfig;
  objects: LabelObject[];
  metadata: Record<string, unknown>;
}
```

Obtain a fresh document from the designer:

```ts
import { LabelDesigner } from '@burnmark-io/designer-core';

const designer = new LabelDesigner({ name: 'My first label' });
const doc: LabelDocument = designer.document;
```

Do **not** mutate `designer.document` directly. Every change must go through
the designer's mutation methods (`add`, `update`, `remove`, `setCanvas`,
`reorder`) so that history snapshots, `updatedAt`, and the `'change'` event
stay consistent. The getter returns the live object for convenience, not an
invitation to write through it.

## `CanvasConfig`

```ts
interface CanvasConfig {
  widthDots: number;      // e.g. 696 for 62 mm @ 300 dpi
  heightDots: number;     // 0 = continuous — auto-crop to content
  dpi: number;
  margins: Margins;       // drawn as a guide, not clipped
  background: string;     // CSS colour — cropped out of continuous labels
  grid: { enabled: boolean; spacingDots: number };
}
```

- **`widthDots`** is always fixed (the media width of a continuous-tape
  printer, or the die-cut width).
- **`heightDots: 0`** is the continuous-label mode. The renderer cuts the
  canvas to the lowest non-background row plus a one-row margin.
  Use this for receipts, address labels, name badges — anything where the
  content dictates the length.
- **`heightDots > 0`** is the die-cut mode: the canvas is a fixed
  rectangle, clipped to that height regardless of content.
- **`dpi`** matters for PDF export (points per inch); the raster pipeline
  works in dots directly.

Defaults live in `DEFAULT_CANVAS` and `DEFAULT_MARGINS`:

```ts
import { DEFAULT_CANVAS, DEFAULT_MARGINS } from '@burnmark-io/designer-core';
```

## Object types

Every object shares a common `BaseObject` shape, then adds type-specific
fields. The `type` field is the discriminator — it's set once at creation
time and cannot change via `update()`.

```ts
interface BaseObject {
  id: string;         // assigned by designer.add()
  type: string;       // discriminator — stable for the lifetime of the object
  x: number;          // top-left, in canvas dots
  y: number;
  width: number;
  height: number;
  rotation: number;   // degrees, clockwise; pivot is the centre of the bbox
  opacity: number;    // 0..1 — composited before 1bpp dithering
  locked: boolean;    // UI hint; core does not enforce
  visible: boolean;   // hidden objects do not render
  name?: string;
  color: string;      // CSS colour — used for flattening to printer planes
}
```

The five object types:

### `TextObject`

```ts
designer.add({
  type: 'text',
  x: 20, y: 20, width: 656, height: 60,
  rotation: 0, opacity: 1, locked: false, visible: true,
  color: '#000000',
  content: 'Hello {{name}}',
  fontFamily: 'Burnmark Sans',
  fontSize: 40,
  fontWeight: 'bold',           // 'normal' | 'bold'
  fontStyle: 'normal',          // 'normal' | 'italic'
  textAlign: 'left',            // 'left' | 'center' | 'right'
  verticalAlign: 'top',         // 'top' | 'middle' | 'bottom'
  letterSpacing: 0,
  lineHeight: 1.2,
  invert: false,                // invert final raster in this object's bbox
  wrap: true,                   // word-wrap to width
  autoHeight: false,            // expand height to fit wrapped text
});
```

Text supports `{{placeholder}}` substitution from `applyVariables()` — see
[Template engine](/guide/template-engine).

### `ImageObject`

```ts
designer.add({
  type: 'image',
  x: 20, y: 100, width: 200, height: 120,
  rotation: 0, opacity: 1, locked: false, visible: true,
  color: '#000000',             // required by BaseObject — not used for images
  assetKey: 'sha1-of-image',    // key into the AssetLoader
  fit: 'contain',               // 'contain' | 'cover' | 'fill' | 'none'
  threshold: 128,               // 0..255 — black/white cutoff for 1bpp
  dither: true,                 // Floyd-Steinberg vs. hard threshold
  invert: false,
});
```

Images are loaded on demand via the `AssetLoader` on the designer — the
document only holds a content-addressed key. See
[Custom renderer](/embedding/custom-renderer) for how to back the loader
with something other than in-memory bytes.

### `BarcodeObject`

```ts
designer.add({
  type: 'barcode',
  x: 20, y: 100, width: 240, height: 80,
  rotation: 0, opacity: 1, locked: false, visible: true,
  color: '#000000',
  format: 'qrcode',             // any `BarcodeFormat`
  data: 'https://example.com/{{slug}}',
  options: { eclevel: 'M' },    // passed through to bwip-js
});
```

The `data` field also supports placeholders. See [Barcodes](/guide/barcodes)
for the full format list and per-format options.

### `ShapeObject`

```ts
designer.add({
  type: 'shape',
  x: 0, y: 0, width: 696, height: 4,
  rotation: 0, opacity: 1, locked: false, visible: true,
  color: '#000000',
  shape: 'rectangle',           // 'rectangle' | 'ellipse' | 'line'
  fill: true,                   // false -> stroked outline
  strokeWidth: 2,
  invert: false,
  cornerRadius: 0,              // rectangle only
  lineDirection: 'horizontal',  // 'line' only
});
```

### `GroupObject`

Groups are containers — children inherit no styling, only the group's
position offset and `visible`/`opacity` flags.

```ts
designer.add({
  type: 'group',
  x: 0, y: 0, width: 300, height: 120,
  rotation: 0, opacity: 1, locked: false, visible: true,
  color: '#000000',
  children: [
    // …nested LabelObject[]
  ],
});
```

## Type guards and traversal

```ts
import {
  isTextObject,
  isImageObject,
  isBarcodeObject,
  isShapeObject,
  isGroupObject,
  walkObjects,
} from '@burnmark-io/designer-core';

for (const obj of walkObjects(designer.document.objects)) {
  if (isTextObject(obj)) {
    // obj.content, obj.fontFamily, etc. narrowed here
  }
}
```

`walkObjects` descends into groups. It yields every object once — group
containers included — so you can, for example, collect every `color`
value in a single pass.

## Mutation API

```ts
const id = designer.add({ type: 'text', /* …fields */ });

designer.update(id, { color: '#ff0000', fontSize: 32 });
// `type` on the patch is ignored — the discriminator is immutable.

designer.reorder(id, 'top');    // 'up' | 'down' | 'top' | 'bottom'

designer.remove(id);

designer.setCanvas({ widthDots: 800 });
```

Every mutation:

1. Applies the change.
2. Bumps `updatedAt`.
3. Pushes a snapshot onto the history stack.
4. Fires `'change'` and `'historyChange'` events.

That's the contract the Vue composable and React hook rely on.

## Serialisation — `.label` file format

```ts
import { toJSON, fromJSON } from '@burnmark-io/designer-core';

const json = designer.toJSON();                  // pretty-printed JSON string
await writeFile('my-label.label', json, 'utf-8');

const loaded = fromJSON(await readFile('my-label.label', 'utf-8'));
designer.loadDocument(loaded);
```

`designer.toJSON()` / `designer.fromJSON()` are thin wrappers that also
reset history when loading. The free functions are useful when you're
serialising a document you never put into a designer (e.g. a programmatic
batch pipeline).

`fromJSON` always routes through `migrateDocument` so any older-version
file is brought up to `CURRENT_DOCUMENT_VERSION` before it's returned.
See the [.label format reference](/reference/label-format) for the
complete schema.

## Document versioning

```ts
import {
  CURRENT_DOCUMENT_VERSION,
  migrateDocument,
  registerMigration,
  DocumentMigrationError,
} from '@burnmark-io/designer-core';
```

- `CURRENT_DOCUMENT_VERSION` — the version number the running code writes
  and understands as "current".
- `migrateDocument(input)` — accepts unknown JSON, applies registered
  migrations sequentially until `version === CURRENT_DOCUMENT_VERSION`,
  and returns a typed `LabelDocument`. Throws `DocumentMigrationError`
  if the input is newer than the running code, or if an intermediate
  migration is missing.
- `registerMigration(fromVersion, migrate)` — register a function that
  transforms a v`fromVersion` document into a v`fromVersion + 1` document.
  Register migrations at module load time.

```ts
registerMigration(1, doc => {
  // Example: rename `description` to `subtitle` in v2.
  const d = doc as { description?: string } & Record<string, unknown>;
  if (d.description) {
    d.subtitle = d.description;
    delete d.description;
  }
  return d;
});
```

The chain runs in-place per version — v1 → v2 → v3 — so you only ever
write single-step migrations.

## History — undo/redo

The designer maintains a snapshot history. Default depth is 100 — override
with the `maxHistoryDepth` constructor option.

```ts
const designer = new LabelDesigner({ maxHistoryDepth: 50 });

designer.add({ type: 'text', /* … */ });
designer.undo();            // reverts the add
designer.redo();            // reapplies it
designer.canUndo;           // boolean getter
designer.canRedo;           // boolean getter
designer.clearHistory();    // drops everything except the current snapshot
```

Listen for history changes:

```ts
const off = designer.on('historyChange', () => {
  console.log('canUndo:', designer.canUndo);
});

// later
off();
```

Snapshots are structured clones — cheap for typical documents, but worth
keeping in mind if you're embedding very large images directly in
`ImageObject.assetKey`-addressed bytes. In those cases, back the
`AssetLoader` with a persistent store so image bytes aren't cloned per
snapshot.
