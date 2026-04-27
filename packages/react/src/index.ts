import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
 * Pure helper: derive on-screen display dimensions from a canvas config.
 * When orientation is `'horizontal'`, axes are swapped so a UI can render
 * the label "the right side up" without altering the underlying document.
 *
 * Continuous canvases (`heightDots === 0`) keep the unbounded axis
 * sentinel intact: when horizontal, `displayHeightDots` reads `widthDots`
 * and `displayWidthDots` is `0` (the unbounded growth axis after swap).
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

export interface DesignerHookOptions {
  canvas?: Partial<CanvasConfig>;
  name?: string;
  designer?: LabelDesigner;
  /** Debounce ms for auto-render after a `change` event. Default 200. */
  renderDebounceMs?: number;
  /** Render immediately on mount so consumers get a bitmap without user action. Default true. */
  renderOnMount?: boolean;
  maxHistoryDepth?: number;
  assetLoader?: DesignerOptions['assetLoader'];
}

export interface DesignerHookReturn {
  designer: LabelDesigner;

  document: LabelDocument;
  canUndo: boolean;
  canRedo: boolean;
  isRendering: boolean;
  bitmap: LabelBitmap | null;
  renderWarning: RenderWarning | null;
  renderError: Error | null;

  /**
   * On-screen width of the label in dots, axes-swapped when
   * `document.canvas.orientation === 'horizontal'`. Use this in place of
   * `document.canvas.widthDots` for canvas/viewport sizing so the user
   * can flip orientation without changing the underlying document.
   */
  displayWidthDots: number;
  /** On-screen height of the label in dots, axes-swapped when horizontal. */
  displayHeightDots: number;

  selection: string[];
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
  /** Zip containing `label.json` + referenced assets; mirrors core's `{ blob, missing }` contract. */
  exportBundled: () => Promise<{ blob: Blob; missing: string[] }>;
}

/**
 * React 18+ hook wrapping a `LabelDesigner` with reactive state and a
 * debounced render loop. The hook produces a single-colour 1bpp bitmap for
 * quick on-canvas preview; apps that want driver-accurate multi-colour
 * preview call `printer.createPreview(rgba)` with RGBA from `designer.render()`.
 *
 * StrictMode safe: the effect's subscription is idempotent — cleanup fires on
 * first-effect teardown and re-subscription is the live copy.
 *
 * SSR safe: no browser APIs are used at construction; the debounce timer only
 * starts inside `useEffect`, which does not run on the server.
 */
export function useLabelDesigner(options: DesignerHookOptions = {}): DesignerHookReturn {
  // Designer — initialised exactly once per hook instance.
  const designerRef = useRef<LabelDesigner | null>(null);
  designerRef.current ??=
    options.designer ??
    new LabelDesigner({
      ...(options.canvas && { canvas: options.canvas }),
      ...(options.name !== undefined && { name: options.name }),
      ...(options.maxHistoryDepth !== undefined && { maxHistoryDepth: options.maxHistoryDepth }),
      ...(options.assetLoader && { assetLoader: options.assetLoader }),
    });
  const designer = designerRef.current;

  // Version counter — bumping forces the component to re-render and pick up
  // the latest `designer.document` (which is mutated in place).
  const [, setVersion] = useState<number>(0);
  const bump = useCallback((): void => {
    setVersion(v => v + 1);
  }, []);

  const [bitmap, setBitmap] = useState<LabelBitmap | null>(null);
  const [renderWarning, setRenderWarning] = useState<RenderWarning | null>(null);
  const [renderError, setRenderError] = useState<Error | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [selection, setSelection] = useState<string[]>([]);

  // Keep latest debounce value in a ref so the effect does not need to
  // re-subscribe when it changes.
  const debounceRef = useRef<number>(options.renderDebounceMs ?? 200);
  debounceRef.current = options.renderDebounceMs ?? 200;

  const renderOnMount = options.renderOnMount ?? true;

  // Exposed as `render()` — populated when the effect is live.
  const forceRenderRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    let generation = 0;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    async function runRender(): Promise<void> {
      const thisGeneration = ++generation;
      setIsRendering(true);
      setRenderWarning(null);
      try {
        const result = await designer.renderToBitmap();
        if (thisGeneration !== generation || disposed) return;
        setBitmap(result);
        setRenderError(null);
      } catch (error) {
        if (thisGeneration !== generation || disposed) return;
        setRenderError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        if (thisGeneration === generation && !disposed) {
          setIsRendering(false);
        }
      }
    }

    function scheduleRender(): void {
      if (disposed) return;
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void runRender();
      }, debounceRef.current);
    }

    const offChange = designer.on('change', () => {
      // Auto-prune selection — only bump React state when it actually changes.
      setSelection(prev => {
        if (prev.length === 0) return prev;
        const valid = new Set<string>();
        for (const o of designer.getAll()) valid.add(o.id);
        const filtered = prev.filter(id => valid.has(id));
        return filtered.length === prev.length ? prev : filtered;
      });
      bump();
      scheduleRender();
    });

    const offHistory = designer.on('historyChange', () => {
      bump();
    });

    const offError = designer.on('error', payload => {
      if (payload instanceof Error) {
        setRenderError(payload);
        return;
      }
      if (
        payload !== null &&
        typeof payload === 'object' &&
        'code' in payload &&
        'message' in payload
      ) {
        setRenderWarning(payload as RenderWarning);
      }
    });

    forceRenderRef.current = async (): Promise<void> => {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      await runRender();
    };

    if (renderOnMount) {
      scheduleRender();
    }

    return () => {
      disposed = true;
      offChange();
      offHistory();
      offError();
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      forceRenderRef.current = null;
    };
  }, [designer, renderOnMount, bump]);

  const select = useCallback((ids: string[]): void => {
    setSelection([...ids]);
  }, []);

  const deselect = useCallback((): void => {
    setSelection([]);
  }, []);

  const render = useCallback(async (): Promise<void> => {
    const fn = forceRenderRef.current;
    if (fn) await fn();
  }, []);

  const actions = useMemo(
    () => ({
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
    }),
    [designer],
  );

  const displayDims = useMemo(
    () => displayDimensions(designer.document.canvas),
    // Recompute whenever the document mutates (bump triggers a re-render
    // and the underlying document mutates in place).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [designer, designer.document.canvas.widthDots, designer.document.canvas.heightDots, designer.document.canvas.orientation],
  );

  return {
    designer,
    document: designer.document,
    canUndo: designer.canUndo,
    canRedo: designer.canRedo,
    isRendering,
    bitmap,
    renderWarning,
    renderError,
    displayWidthDots: displayDims.displayWidthDots,
    displayHeightDots: displayDims.displayHeightDots,
    selection,
    select,
    deselect,
    render,
    ...actions,
  };
}
