import { onScopeDispose, ref, shallowRef, type Ref, type ShallowRef } from 'vue';
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
  type PrinterCapabilities,
  type RenderWarning,
  type ReorderDirection,
  type SheetTemplate,
} from '@burnmark-io/designer-core';

export interface DesignerComposableOptions {
  canvas?: Partial<CanvasConfig>;
  name?: string;
  designer?: LabelDesigner;
  capabilities?: PrinterCapabilities;
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
  planes: ShallowRef<Map<string, LabelBitmap> | null>;
  renderWarning: ShallowRef<RenderWarning | null>;
  renderError: ShallowRef<Error | null>;

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
 * and debounced rendering. See `designer-core-amendment-bindings.md` for the
 * design rationale — in particular the `shallowRef` + `triggerRef` pattern
 * used to force updates despite the core mutating the document in place.
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

  const capabilities = options.capabilities;
  const debounceMs = options.renderDebounceMs ?? 200;
  const renderOnMount = options.renderOnMount ?? true;

  const document = shallowRef<LabelDocument>(designer.document);
  const canUndo = ref<boolean>(designer.canUndo);
  const canRedo = ref<boolean>(designer.canRedo);
  const isRendering = ref<boolean>(false);
  const bitmap = shallowRef<LabelBitmap | null>(null);
  const planes = shallowRef<Map<string, LabelBitmap> | null>(null);
  const renderWarning = shallowRef<RenderWarning | null>(null);
  const renderError = shallowRef<Error | null>(null);
  const selection = ref<string[]>([]);

  // Generation counter discards results from superseded renders.
  let generation = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  async function runRender(): Promise<void> {
    const thisGeneration = ++generation;
    isRendering.value = true;
    renderWarning.value = null;

    try {
      if (capabilities) {
        const result = await designer.renderPlanes(capabilities);
        if (thisGeneration !== generation || disposed) return;
        planes.value = result;
        bitmap.value = result.get('black') ?? firstValue(result);
      } else {
        const result = await designer.renderToBitmap();
        if (thisGeneration !== generation || disposed) return;
        bitmap.value = result;
        planes.value = null;
      }
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
  // always fire triggerRef so Vue picks up in-place mutations too.
  const offChange = designer.on('change', () => {
    document.value = designer.document;
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
    planes,
    renderWarning,
    renderError,
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

function firstValue<V>(map: Map<string, V>): V | null {
  for (const v of map.values()) return v;
  return null;
}
