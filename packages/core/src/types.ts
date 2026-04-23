/**
 * Shared types for @burnmark-io/designer-core.
 *
 * Public types used across document, render, colour, template, and batch.
 */

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CanvasConfig {
  widthDots: number;
  heightDots: number;
  dpi: number;
  margins: Margins;
  background: string;
  grid: { enabled: boolean; spacingDots: number };
}

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  unused: string[];
  warnings: string[];
  errors?: string[];
}

/**
 * Raw RGBA image data — structurally compatible with browser `ImageData`
 * and `@napi-rs/canvas` image data.
 */
export interface RawImageData {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray | Uint8Array;
}

// ---------- Barcodes ----------

/** Exported — part of the public document model. */
export type BarcodeFormat =
  | 'code128'
  | 'code128a'
  | 'code128b'
  | 'code128c'
  | 'code39'
  | 'code39ext'
  | 'code93'
  | 'code11'
  | 'codabar'
  | 'ean13'
  | 'ean8'
  | 'upca'
  | 'upce'
  | 'itf14'
  | 'interleaved2of5'
  | 'gs1_128'
  | 'databar'
  | 'databarexpanded'
  | 'pharmacode'
  | 'msi'
  | 'postnet'
  | 'royalmail'
  | 'kix'
  | 'onecode'
  | 'qrcode'
  | 'microqr'
  | 'datamatrix'
  | 'datamatrixrectangular'
  | 'pdf417'
  | 'micropdf417'
  | 'azteccode'
  | 'aztecrune'
  | 'maxicode'
  | 'dotcode'
  | 'hanxin'
  | 'gs1qrcode'
  | 'gs1datamatrix'
  | 'gs1_cc'
  | 'auspost'
  | 'japanpost'
  | 'leitcode'
  | 'identcode'
  | 'hibccode128'
  | 'isbt128'
  | 'pzn';

export interface BarcodeOptions {
  scale?: number;
  rotate?: 'N' | 'R' | 'L' | 'I';
  padding?: number;
  includetext?: boolean;
  textsize?: number;
  textyoffset?: number;
  eclevel?: 'L' | 'M' | 'Q' | 'H';
  version?: number;
  rows?: number;
  columns?: number;
}

// ---------- Printer capabilities / colour pipeline ----------

export interface PrinterColor {
  name: string;
  cssMatch: string[];
}

export interface PrinterCapabilities {
  colors: PrinterColor[];
}

// ---------- Events ----------

export type DesignerEvent = 'change' | 'render' | 'historyChange' | 'error';

export interface RenderWarning {
  code: string;
  message: string;
  objectId?: string;
}

// ---------- Document shape (re-exported from document.ts) ----------

export const CURRENT_DOCUMENT_VERSION = 1;
