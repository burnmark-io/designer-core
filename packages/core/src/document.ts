import { CURRENT_DOCUMENT_VERSION, type CanvasConfig, type Margins } from './types.js';
import { type LabelObject } from './objects.js';

export interface LabelDocument {
  id: string;
  version: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  canvas: CanvasConfig;
  objects: LabelObject[];
  metadata: Record<string, unknown>;
}

export const DEFAULT_MARGINS: Margins = { top: 10, right: 10, bottom: 10, left: 10 };

export const DEFAULT_CANVAS: CanvasConfig = {
  widthDots: 696,
  heightDots: 0,
  dpi: 300,
  margins: { ...DEFAULT_MARGINS },
  background: '#ffffff',
  grid: { enabled: false, spacingDots: 10 },
  orientation: 'vertical',
};

export function createDocument(
  id: string,
  canvas: Partial<CanvasConfig> = {},
  name = 'Untitled',
): LabelDocument {
  const now = new Date().toISOString();
  return {
    id,
    version: CURRENT_DOCUMENT_VERSION,
    name,
    createdAt: now,
    updatedAt: now,
    canvas: mergeCanvas(DEFAULT_CANVAS, canvas),
    objects: [],
    metadata: {},
  };
}

export function mergeCanvas(base: CanvasConfig, patch: Partial<CanvasConfig>): CanvasConfig {
  return {
    widthDots: patch.widthDots ?? base.widthDots,
    heightDots: patch.heightDots ?? base.heightDots,
    dpi: patch.dpi ?? base.dpi,
    margins: patch.margins ? { ...base.margins, ...patch.margins } : { ...base.margins },
    background: patch.background ?? base.background,
    grid: patch.grid ? { ...base.grid, ...patch.grid } : { ...base.grid },
    orientation: patch.orientation ?? base.orientation ?? 'vertical',
  };
}
