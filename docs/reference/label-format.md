# `.label` file format

A `.label` file is a JSON document conforming to the `LabelDocument`
shape. It's portable, human-readable, and round-trip safe through
`toJSON` / `fromJSON` — serialising a loaded document produces
byte-identical output to the original, modulo the `updatedAt`
timestamp, which is bumped on load.

## The schema

```ts
interface LabelDocument {
  id: string; // stable ID — survives renames
  version: number; // matches CURRENT_DOCUMENT_VERSION on load
  name: string;
  description?: string;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601 — bumped on every mutation
  canvas: CanvasConfig; // see below
  objects: LabelObject[]; // one of five object types
  metadata: Record<string, unknown>; // user-defined; never rendered
}

interface CanvasConfig {
  widthDots: number;
  heightDots: number; // 0 = continuous — auto-crop to content
  dpi: number;
  margins: { top: number; right: number; bottom: number; left: number };
  background: string; // CSS colour — used for continuous crop
  grid: { enabled: boolean; spacingDots: number };
}
```

See [Document model](/guide/document-model) for the five object-type
shapes and their fields.

## Example — the Christmas-card address label

The walkthrough in [Template engine](/guide/template-engine#christmas-cards-walkthrough)
uses [`christmas-card.label`](/assets/christmas-card.label), committed
to the docs as the single source of truth. Opening it produces:

```json
{
  "id": "christmas-card-address-label",
  "version": 1,
  "name": "Christmas card address label",
  "description": "62 mm continuous tape. Used for the docs walkthrough.",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "canvas": {
    "widthDots": 696,
    "heightDots": 0,
    "dpi": 300,
    "margins": { "top": 12, "right": 12, "bottom": 12, "left": 12 },
    "background": "#ffffff",
    "grid": { "enabled": false, "spacingDots": 10 }
  },
  "objects": [
    {
      "id": "name",
      "type": "text",
      "name": "Recipient name",
      "x": 24,
      "y": 24,
      "width": 648,
      "height": 60,
      "rotation": 0,
      "opacity": 1,
      "locked": false,
      "visible": true,
      "color": "#ff0000",
      "content": "{{name}}",
      "fontFamily": "Burnmark Sans",
      "fontSize": 44,
      "fontWeight": "bold",
      "fontStyle": "normal",
      "textAlign": "left",
      "verticalAlign": "top",
      "letterSpacing": 0,
      "lineHeight": 1.2,
      "invert": false,
      "wrap": true,
      "autoHeight": false
    }
    /* … two more TextObjects for address line and postcode/city — see the file … */
  ],
  "metadata": {
    "category": "holiday",
    "locale": "nl_NL",
    "docsExample": true
  }
}
```

Field-by-field annotations:

| Field                        | Purpose                                                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `id`                         | Stable UUID / slug. Survives renames — use it for foreign keys, never `name`.                                              |
| `version`                    | Schema version. Equals `CURRENT_DOCUMENT_VERSION` (1 today). Older files are migrated forward on load.                     |
| `name`                       | Human-readable title. Shown in UIs; safe to change.                                                                        |
| `description`                | Optional long-form summary. Never rendered.                                                                                |
| `createdAt`                  | ISO-8601 creation timestamp. Immutable.                                                                                    |
| `updatedAt`                  | ISO-8601 last-mutation timestamp. Bumped on every `add`/`update`/`remove`/`setCanvas` and also on `loadDocument`.          |
| `canvas.widthDots`           | Media width in printer dots (696 = 62 mm at 300 dpi).                                                                      |
| `canvas.heightDots`          | `0` for continuous tape (auto-crop); positive for die-cut labels.                                                          |
| `canvas.dpi`                 | Matters for PDF export (points per inch); the raster pipeline works in dots.                                               |
| `canvas.margins`             | Visual guide for the UI. Does not clip rendering.                                                                          |
| `canvas.background`          | CSS colour. Cropped out on continuous labels to find content bounds.                                                       |
| `canvas.grid`                | Designer-UI snap hint. Not rendered.                                                                                       |
| `objects[].id`               | Assigned by `designer.add()`. Stable across history snapshots.                                                             |
| `objects[].type`             | Discriminator — `text`, `image`, `barcode`, `shape`, `group`. Immutable via `update()`.                                    |
| `objects[].x,y,width,height` | Top-left bounding box in canvas dots.                                                                                      |
| `objects[].rotation`         | Degrees, clockwise; pivot at bbox centre.                                                                                  |
| `objects[].opacity`          | `0`..`1`. Composited in full-colour space before 1bpp dithering — see [Colour model](/guide/colour-model#opacity-stipple). |
| `objects[].locked`           | UI hint; core does not enforce.                                                                                            |
| `objects[].visible`          | Hidden objects do not render.                                                                                              |
| `objects[].color`            | CSS string. Drives plane routing during `renderPlanes()`.                                                                  |
| `metadata`                   | User-defined dictionary. Never rendered. Use it for categorisation, tags, ownership — anything app-specific.               |

## Asset references

`ImageObject.assetKey` is a content-addressed key into the designer's
`AssetLoader`. The image bytes are **never** inlined into the `.label`
JSON — that would make files huge, history snapshots expensive, and
diffs unreadable.

```json
{
  "type": "image",
  "assetKey": "e1b2c9d3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9",
  "fit": "contain",
  "threshold": 128,
  "dither": true,
  "invert": false
  /* …plus BaseObject fields… */
}
```

Shipping a document to another environment means you either:

- Ship the asset store alongside (same IndexedDB, same S3 bucket,
  same filesystem). The assetKey resolves on the other side.
- Bundle via `exportBundled(doc, assetLoader)` — produces a `.zip`
  with `label.json` + `assets/<assetKey>` entries. See
  [Export → exportBundled](/guide/export#exportbundled-doc-assetloader).

## Version field and migrations

```ts
import { CURRENT_DOCUMENT_VERSION } from '@burnmark-io/designer-core';
```

- Today `CURRENT_DOCUMENT_VERSION === 1`. Every document you write
  today has `"version": 1`.
- When version 2 ships, the runtime will include a registered migration
  from 1 → 2. Loading a v1 document through `fromJSON()` or
  `migrateDocument()` will apply that migration and return a v2
  document.
- Loading a document that is **newer** than the running code's
  `CURRENT_DOCUMENT_VERSION` throws `DocumentMigrationError`. Upgrade
  `@burnmark-io/designer-core` to read the file.

The migration chain runs sequentially: a v1 document loaded on code
that supports v3 runs v1→v2 and v2→v3 before returning. See
[Document model → Versioning](/guide/document-model#document-versioning)
for the `registerMigration` API.

## Forward compatibility

If you're building infrastructure that stores `.label` files
long-term:

- **Don't parse the JSON yourself.** Use `fromJSON()` — it runs the
  migration chain. Stored files are always kept at their original
  version on disk; migration happens on load.
- **Pin your writers, float your readers.** Readers (apps that display
  labels) should be on the latest `@burnmark-io/designer-core`.
  Writers (CI jobs, scripts) can stay on older versions without
  blocking reader updates, because old writers produce files the new
  readers can migrate.
- **Keep `metadata` for app-specific data.** Don't add new top-level
  fields to the document; add them to `metadata`. That's what the
  dictionary exists for.

## The `metadata` field

Free-form user-defined storage. The renderer ignores it; the migration
chain leaves it alone; serialisation passes it through.

Useful patterns:

- **Template categorisation.** `{ "category": "shipping", "subcategory": "air-freight" }`.
- **Ownership.** `{ "createdBy": "piet@example.nl", "tenant": "acme" }`.
- **Change tracking.** `{ "revision": 12, "previousId": "…" }`.
- **Locale.** `{ "locale": "nl_NL", "currency": "EUR" }`.

Nothing is validated — `Record<string, unknown>` — so be disciplined
about what you put there. Treat it as your app's custom header.
