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
