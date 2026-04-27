import { computed, onScopeDispose, ref, shallowRef, triggerRef, type ComputedRef, type Ref, type ShallowRef } from 'vue';
import {
  LabelDesigner,
  exportBundled as exportBundledCore,
  exportPdf as exportPdfCore,
  exportPng as exportPngCore,
  exportSheet as exportSheetCore,
  type CanvasConfig,
  type DesignerOptions,
  type LabelBitmap,
  type LabelDocument,
  type LabelObject,
  type LabelObjectInput,
  type RenderWarning,
  type ReorderDirection,
  type SheetTemplate,
} from '@burnmark-io/designer-core';

/**
 * Pure helper: derive the on-screen display dimensions from a canvas
 * config. When orientation is `'horizontal'`, axes are swapped so a
 * UI laying out the canvas can render the label "the right side up"
 * without altering the underlying document.
 *
 * Continuous canvases (`heightDots === 0`) keep the unbounded axis
 * sentinel intact — `displayHeightDots` reads `widthDots` (the across-
 * feed dimension) and `displayWidthDots` is `0` (the unbounded growth
 * axis, after swap).
 */
export function displayDimensions(canvas: {
  widthDots: number;
  heightDots: number;
  orientation?: 'vertical' | 'horizontal';
}): { displayWidthDots: number; displayHeightDots: number } {
  if (canvas.orientation !== 'horizontal') {
    return { displayWidthDots: canvas.widthDots, displayHeightDots: canvas.heightDots };
  }
  return { displayWidthDots: canvas.heightDots, displayHeightDots: canvas.widthDots };
}

export interface DesignerComposableOptions {
  canvas?: Partial<CanvasConfig>;
  name?: string;
  designer?: LabelDesigner;
  /** Debounce ms for auto-render after a `change` event. Default 200. */
  renderDebounceMs?: number;
  /** Render immediately on mount so consumers get a bitmap without user action. Default true. */
  renderOnMount?: boolean;
  /** Forwarded to the `LabelDesigner` constructor when `designer` is not provided. */
  maxHistoryDepth?: number;
  assetLoader?: DesignerOptions['assetLoader'];
}

export interface DesignerComposableReturn {
  designer: LabelDesigner;

  document: ShallowRef<LabelDocument>;
  canUndo: Ref<boolean>;
  canRedo: Ref<boolean>;
  isRendering: Ref<boolean>;
  bitmap: ShallowRef<LabelBitmap | null>;
  renderWarning: ShallowRef<RenderWarning | null>;
  renderError: ShallowRef<Error | null>;

  /**
   * On-screen width of the label in dots, axes-swapped when
   * `document.canvas.orientation === 'horizontal'`. Use this in place of
   * `document.canvas.widthDots` for canvas/viewport sizing so the user
   * can flip orientation without changing the underlying document.
   */
  displayWidthDots: ComputedRef<number>;
  /** On-screen height of the label in dots, axes-swapped when horizontal. */
  displayHeightDots: ComputedRef<number>;

  selection: Ref<string[]>;
  select: (ids: string[]) => void;
  deselect: () => void;

  loadDocument: (doc: LabelDocument) => void;
  newDocument: (canvas?: Partial<CanvasConfig>, name?: string) => void;
  toJSON: () => string;
  fromJSON: (json: string) => void;

  add: (object: LabelObjectInput) => string;
  update: (id: string, patch: Partial<LabelObject>) => void;
  remove: (id: string) => void;
  reorder: (id: string, direction: ReorderDirection) => void;
  get: (id: string) => LabelObject | undefined;
  getAll: () => LabelObject[];

  setCanvas: (patch: Partial<CanvasConfig>) => void;

  undo: () => void;
  redo: () => void;
  clearHistory: () => void;

  getPlaceholders: () => string[];
  applyVariables: (variables: Record<string, string>) => LabelDocument;

  /** Force a render now (bypasses debounce). Useful after external doc changes. */
  render: () => Promise<void>;

  exportPng: (variables?: Record<string, string>, scale?: number) => Promise<Blob>;
  exportPdf: (rows?: Record<string, string>[], variables?: Record<string, string>) => Promise<Blob>;
  exportSheet: (
    sheet: SheetTemplate,
    rows?: Record<string, string>[],
    variables?: Record<string, string>,
  ) => Promise<Blob>;
  /**
   * Zip containing `label.json` + referenced assets. Returns both the blob and
   * the list of asset keys that could not be resolved — core's actual contract.
   */
  exportBundled: () => Promise<{ blob: Blob; missing: string[] }>;
}

/**
 * Vue 3 composable wrapping a `LabelDesigner` instance with reactive state
 * and debounced rendering. The composable renders a single-colour 1bpp
 * bitmap for quick on-canvas preview; apps that want a driver-accurate
 * multi-colour preview should call `printer.createPreview(rgba)` with the
 * RGBA from `designer.render()`.
 */
export function useLabelDesigner(
  options: DesignerComposableOptions = {},
): DesignerComposableReturn {
  const designer =
    options.designer ??
    new LabelDesigner({
      ...(options.canvas && { canvas: options.canvas }),
      ...(options.name !== undefined && { name: options.name }),
      ...(options.maxHistoryDepth !== undefined && { maxHistoryDepth: options.maxHistoryDepth }),
      ...(options.assetLoader && { assetLoader: options.assetLoader }),
    });

  const debounceMs = options.renderDebounceMs ?? 200;
  const renderOnMount = options.renderOnMount ?? true;

  const document = shallowRef<LabelDocument>(designer.document);
  const canUndo = ref<boolean>(designer.canUndo);
  const canRedo = ref<boolean>(designer.canRedo);
  const isRendering = ref<boolean>(false);
  const bitmap = shallowRef<LabelBitmap | null>(null);
  const renderWarning = shallowRef<RenderWarning | null>(null);
  const renderError = shallowRef<Error | null>(null);
  const selection = ref<string[]>([]);

  const displayWidthDots = computed(() => displayDimensions(document.value.canvas).displayWidthDots);
  const displayHeightDots = computed(
    () => displayDimensions(document.value.canvas).displayHeightDots,
  );

  // Generation counter discards results from superseded renders.
  let generation = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  async function runRender(): Promise<void> {
    const thisGeneration = ++generation;
    isRendering.value = true;
    renderWarning.value = null;

    try {
      const result = await designer.renderToBitmap();
      if (thisGeneration !== generation || disposed) return;
      bitmap.value = result;
      renderError.value = null;
    } catch (error) {
      if (thisGeneration !== generation || disposed) return;
      renderError.value = error instanceof Error ? error : new Error(String(error));
    } finally {
      if (thisGeneration === generation && !disposed) {
        isRendering.value = false;
      }
    }
  }

  function scheduleRender(): void {
    if (disposed) return;
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void runRender();
    }, debounceMs);
  }

  // Replace the document ref (core swaps identity on load/new/undo/redo) and
  // always fire triggerRef so dependent computeds (e.g. `displayWidthDots`)
  // pick up in-place canvas mutations even when the document identity is
  // preserved.
  const offChange = designer.on('change', () => {
    document.value = designer.document;
    triggerRef(document);
    // Auto-prune selection: drop IDs that no longer exist.
    if (selection.value.length > 0) {
      const validIds = new Set<string>();
      for (const o of designer.getAll()) validIds.add(o.id);
      if (selection.value.some(id => !validIds.has(id))) {
        selection.value = selection.value.filter(id => validIds.has(id));
      }
    }
    scheduleRender();
  });

  const offHistoryChange = designer.on('historyChange', () => {
    canUndo.value = designer.canUndo;
    canRedo.value = designer.canRedo;
  });

  const offError = designer.on('error', payload => {
    if (payload instanceof Error) {
      renderError.value = payload;
      return;
    }
    if (
      payload !== null &&
      typeof payload === 'object' &&
      'code' in payload &&
      'message' in payload
    ) {
      renderWarning.value = payload as RenderWarning;
    }
  });

  onScopeDispose(() => {
    disposed = true;
    offChange();
    offHistoryChange();
    offError();
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  });

  if (renderOnMount) {
    scheduleRender();
  }

  return {
    designer,
    document,
    canUndo,
    canRedo,
    isRendering,
    bitmap,
    renderWarning,
    renderError,
    displayWidthDots,
    displayHeightDots,
    selection,
    select: (ids: string[]): void => {
      selection.value = [...ids];
    },
    deselect: (): void => {
      selection.value = [];
    },
    loadDocument: (doc: LabelDocument): void => {
      designer.loadDocument(doc);
    },
    newDocument: (canvas?: Partial<CanvasConfig>, name?: string): void => {
      designer.newDocument(canvas ?? {}, name);
    },
    toJSON: (): string => designer.toJSON(),
    fromJSON: (json: string): void => {
      designer.fromJSON(json);
    },
    add: (object: LabelObjectInput): string => designer.add(object),
    update: (id: string, patch: Partial<LabelObject>): void => {
      designer.update(id, patch);
    },
    remove: (id: string): void => {
      designer.remove(id);
    },
    reorder: (id: string, direction: ReorderDirection): void => {
      designer.reorder(id, direction);
    },
    get: (id: string): LabelObject | undefined => designer.get(id),
    getAll: (): LabelObject[] => designer.getAll(),
    setCanvas: (patch: Partial<CanvasConfig>): void => {
      designer.setCanvas(patch);
    },
    undo: (): void => {
      designer.undo();
    },
    redo: (): void => {
      designer.redo();
    },
    clearHistory: (): void => {
      designer.clearHistory();
    },
    getPlaceholders: (): string[] => designer.getPlaceholders(),
    applyVariables: (variables: Record<string, string>): LabelDocument =>
      designer.applyVariables(variables),
    render: async (): Promise<void> => {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      await runRender();
    },
    exportPng: (variables?: Record<string, string>, scale?: number): Promise<Blob> =>
      exportPngCore(designer.document, {
        assetLoader: designer.assetLoader,
        ...(variables && { variables }),
        ...(scale !== undefined && { scale }),
      }),
    exportPdf: (
      rows?: Record<string, string>[],
      variables?: Record<string, string>,
    ): Promise<Blob> =>
      exportPdfCore(designer.document, rows, {
        assetLoader: designer.assetLoader,
        ...(variables && { variables }),
      }),
    exportSheet: (
      sheet: SheetTemplate,
      rows?: Record<string, string>[],
      variables?: Record<string, string>,
    ): Promise<Blob> =>
      exportSheetCore(designer.document, sheet, rows, {
        assetLoader: designer.assetLoader,
        ...(variables && { variables }),
      }),
    exportBundled: (): Promise<{ blob: Blob; missing: string[] }> =>
      exportBundledCore(designer.document, designer.assetLoader),
  };
}
