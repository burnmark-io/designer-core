import { createDocument, mergeCanvas, type LabelDocument } from './document.js';
import { walkObjects, type LabelObject, type LabelObjectInput } from './objects.js';
import { EventEmitter, type EventHandler } from './events.js';
import { History } from './history.js';
import { randomUUID } from './id.js';
import { fromJSON, toJSON } from './serialisation.js';
import {
  type CanvasConfig,
  type DesignerEvent,
  type PrinterCapabilities,
  type RawImageData,
  type RenderWarning,
} from './types.js';
import { renderFull, renderPlanes, toBitmap, type RenderOptions } from './render/pipeline.js';
import { SINGLE_COLOR } from './render/colour.js';
import { type AssetLoader, InMemoryAssetLoader } from './assets.js';
import { applyVariables, extractPlaceholders } from './template.js';
import { type BatchResult } from './batch.js';
import { type LabelBitmap } from '@mbtech-nl/bitmap';

export interface DesignerOptions {
  canvas?: Partial<CanvasConfig>;
  name?: string;
  maxHistoryDepth?: number;
  assetLoader?: AssetLoader;
}

export type ReorderDirection = 'up' | 'down' | 'top' | 'bottom';

/**
 * Main entry point for the label designer. Manages document state,
 * history, and (in later steps) rendering.
 *
 * Selection is NOT managed here — it's UI state and belongs in the
 * framework binding layer (Vue composable, React hook, application code).
 */
export class LabelDesigner {
  private doc: LabelDocument;
  private readonly history: History;
  private readonly emitter = new EventEmitter();
  readonly assetLoader: AssetLoader;

  constructor(options: DesignerOptions = {}) {
    this.doc = createDocument(randomUUID(), options.canvas ?? {}, options.name);
    this.history = new History(options.maxHistoryDepth ?? 100);
    this.history.push(this.doc);
    this.assetLoader = options.assetLoader ?? new InMemoryAssetLoader();
  }

  // --- Document ---

  /**
   * The current document state. Do NOT mutate directly — use
   * {@link add}/{@link update}/{@link remove}/{@link setCanvas} which track
   * history. Returned object is the live snapshot; mutations are not
   * enforced against.
   */
  get document(): LabelDocument {
    return this.doc;
  }

  loadDocument(doc: LabelDocument): void {
    this.doc = structuredClone(doc);
    this.doc.updatedAt = new Date().toISOString();
    this.history.clear();
    this.history.push(this.doc);
    this.emitter.emit('change');
    this.emitter.emit('historyChange');
  }

  newDocument(canvas: Partial<CanvasConfig> = {}, name?: string): void {
    this.doc = createDocument(randomUUID(), canvas, name);
    this.history.clear();
    this.history.push(this.doc);
    this.emitter.emit('change');
    this.emitter.emit('historyChange');
  }

  toJSON(): string {
    return toJSON(this.doc);
  }

  fromJSON(json: string): void {
    this.loadDocument(fromJSON(json));
  }

  // --- Objects ---

  add(object: LabelObjectInput): string {
    const id = randomUUID();
    const created = { ...object, id } as LabelObject;
    this.mutate(d => {
      d.objects.push(created);
    });
    return id;
  }

  update(id: string, patch: Partial<LabelObject>): void {
    this.mutate(d => {
      const idx = d.objects.findIndex(o => o.id === id);
      if (idx === -1) return;
      const existing = d.objects[idx];
      if (!existing) return;
      // Preserve discriminator — never let `type` change via update.
      const next = { ...existing, ...patch, id: existing.id, type: existing.type } as LabelObject;
      d.objects[idx] = next;
    });
  }

  remove(id: string): void {
    this.mutate(d => {
      const idx = d.objects.findIndex(o => o.id === id);
      if (idx !== -1) d.objects.splice(idx, 1);
    });
  }

  reorder(id: string, direction: ReorderDirection): void {
    this.mutate(d => {
      const idx = d.objects.findIndex(o => o.id === id);
      if (idx === -1) return;
      const obj = d.objects[idx];
      if (!obj) return;

      switch (direction) {
        case 'up':
          if (idx < d.objects.length - 1) {
            d.objects.splice(idx, 1);
            d.objects.splice(idx + 1, 0, obj);
          }
          return;
        case 'down':
          if (idx > 0) {
            d.objects.splice(idx, 1);
            d.objects.splice(idx - 1, 0, obj);
          }
          return;
        case 'top':
          if (idx < d.objects.length - 1) {
            d.objects.splice(idx, 1);
            d.objects.push(obj);
          }
          return;
        case 'bottom':
          if (idx > 0) {
            d.objects.splice(idx, 1);
            d.objects.unshift(obj);
          }
          return;
      }
    });
  }

  get(id: string): LabelObject | undefined {
    for (const o of walkObjects(this.doc.objects)) {
      if (o.id === id) return o;
    }
    return undefined;
  }

  getAll(): LabelObject[] {
    return [...this.doc.objects];
  }

  // --- Canvas ---

  setCanvas(patch: Partial<CanvasConfig>): void {
    this.mutate(d => {
      d.canvas = mergeCanvas(d.canvas, patch);
    });
  }

  // --- History ---

  undo(): void {
    const snapshot = this.history.undo();
    if (!snapshot) return;
    this.doc = snapshot;
    this.emitter.emit('change');
    this.emitter.emit('historyChange');
  }

  redo(): void {
    const snapshot = this.history.redo();
    if (!snapshot) return;
    this.doc = snapshot;
    this.emitter.emit('change');
    this.emitter.emit('historyChange');
  }

  get canUndo(): boolean {
    return this.history.canUndo;
  }

  get canRedo(): boolean {
    return this.history.canRedo;
  }

  clearHistory(): void {
    this.history.clear();
    this.history.push(this.doc);
    this.emitter.emit('historyChange');
  }

  // --- Events ---

  on(event: DesignerEvent, handler: EventHandler): () => void {
    return this.emitter.on(event, handler);
  }

  off(event: DesignerEvent, handler: EventHandler): void {
    this.emitter.off(event, handler);
  }

  // --- Rendering ---

  /** Full-colour RGBA render of the document. No 1bpp conversion. */
  async render(variables?: Record<string, string>): Promise<RawImageData> {
    const opts = this.buildRenderOptions(variables);
    const image = await renderFull(this.doc, opts);
    this.emitter.emit('render');
    return image;
  }

  /** Single-plane 1bpp render. All objects → black. */
  async renderToBitmap(variables?: Record<string, string>): Promise<LabelBitmap> {
    const planes = await this.renderPlanes(SINGLE_COLOR, variables);
    const plane = planes.get('black');
    if (!plane) throw new Error('SINGLE_COLOR plane "black" not produced');
    return plane;
  }

  /** Multi-plane 1bpp render per printer capability set. */
  async renderPlanes(
    capabilities: PrinterCapabilities,
    variables?: Record<string, string>,
  ): Promise<Map<string, LabelBitmap>> {
    const opts = this.buildRenderOptions(variables);
    const out = await renderPlanes(this.doc, capabilities, opts);
    this.emitter.emit('render');
    return out;
  }

  // --- Templates ---

  getPlaceholders(): string[] {
    return extractPlaceholders(this.doc);
  }

  applyVariables(variables: Record<string, string>): LabelDocument {
    return applyVariables(this.doc, variables);
  }

  private buildRenderOptions(variables?: Record<string, string>): RenderOptions {
    const opts: RenderOptions = {
      assetLoader: this.assetLoader,
      onWarning: (w: RenderWarning) => {
        this.emitter.emit('error', w);
      },
    };
    if (variables !== undefined) opts.variables = variables;
    return opts;
  }

  /** Expose `toBitmap` for callers who already have RGBA pixels. */
  static toBitmap(
    rgba: RawImageData,
    options: { threshold?: number; dither?: boolean; invert?: boolean } = {},
  ): LabelBitmap {
    return toBitmap(rgba, options);
  }

  /**
   * Render a batch of labels from CSV rows, one per row. Yields each
   * `BatchResult` so the consumer can print it and let it be garbage
   * collected before the next is produced.
   */
  async *renderBatch(
    rows: Record<string, string>[],
    capabilities?: PrinterCapabilities,
  ): AsyncGenerator<BatchResult> {
    const { renderBatch } = await import('./batch.js');
    yield* renderBatch(this, rows, capabilities);
  }

  // --- internal ---

  private mutate(fn: (d: LabelDocument) => void): void {
    fn(this.doc);
    this.doc.updatedAt = new Date().toISOString();
    this.history.push(this.doc);
    this.emitter.emit('change');
    this.emitter.emit('historyChange');
  }
}
