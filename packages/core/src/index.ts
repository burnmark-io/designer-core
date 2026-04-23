// Types
export type {
  Margins,
  CanvasConfig,
  ValidationResult,
  RawImageData,
  BarcodeFormat,
  BarcodeOptions,
  PrinterColor,
  PrinterCapabilities,
  DesignerEvent,
  RenderWarning,
} from './types.js';
export { CURRENT_DOCUMENT_VERSION } from './types.js';

// Document / objects
export type { LabelDocument } from './document.js';
export { createDocument, mergeCanvas, DEFAULT_CANVAS, DEFAULT_MARGINS } from './document.js';
export type {
  BaseObject,
  TextObject,
  ImageObject,
  BarcodeObject,
  ShapeObject,
  GroupObject,
  LabelObject,
  LabelObjectInput,
} from './objects.js';
export {
  isTextObject,
  isImageObject,
  isBarcodeObject,
  isShapeObject,
  isGroupObject,
  walkObjects,
} from './objects.js';

// Designer
export { LabelDesigner } from './designer.js';
export type { DesignerOptions } from './designer.js';
export type { EventHandler } from './events.js';

// Serialisation
export { toJSON, fromJSON } from './serialisation.js';
export { migrateDocument, registerMigration, DocumentMigrationError } from './migration.js';

// History
export { History } from './history.js';

// Template engine
export {
  applyTemplate,
  applyVariables,
  extractPlaceholders,
  validateVariables,
} from './template.js';

// CSV
export { parseCsv } from './csv.js';
export type { CsvData } from './csv.js';

// Render pipeline
export {
  renderFull,
  renderPlanes as renderPlanesFn,
  renderPlaneImages,
  toBitmap,
  type RenderOptions,
} from './render/pipeline.js';
export { flattenForPrinter } from './flatten.js';
export { SINGLE_COLOR, TWO_COLOR_BLACK_RED, matchColourToPlane } from './render/colour.js';
export { BarcodeEngine } from './render/barcode.js';
export { QRContent } from './qr-content.js';
export type { VCardContact } from './qr-content.js';

// Assets
export { InMemoryAssetLoader } from './assets.js';
export type { AssetLoader } from './assets.js';

// Fonts
export {
  BUNDLED_FONTS,
  DefaultFontLoader,
  registerFont,
  isFontLoaded,
  listFonts,
} from './fonts.js';
export type { FontLoader, FontDescriptor, BundledFontFamily, BundledFontEntry } from './fonts.js';

// Re-export LabelBitmap type for convenience
export type { LabelBitmap, RawImageData as BitmapRawImageData } from '@mbtech-nl/bitmap';
