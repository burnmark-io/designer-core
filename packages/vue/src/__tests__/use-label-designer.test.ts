import { effectScope, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LabelDesigner,
  type LabelBitmap,
  type LabelObjectInput,
  type TextObject,
} from '@burnmark-io/designer-core';
import { displayDimensions, useLabelDesigner, type DesignerComposableReturn } from '../index.js';

function textInput(
  overrides: Partial<LabelObjectInput<TextObject>> = {},
): LabelObjectInput<TextObject> {
  return {
    type: 'text',
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    color: '#000000',
    content: 'Hello',
    fontFamily: 'Burnmark Sans',
    fontSize: 20,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    verticalAlign: 'top',
    letterSpacing: 0,
    lineHeight: 1.2,
    invert: false,
    wrap: false,
    autoHeight: false,
    ...overrides,
  };
}

function fakeBitmap(width = 10, height = 10): LabelBitmap {
  return {
    widthPx: width,
    heightPx: height,
    data: new Uint8Array(Math.ceil((width * height) / 8)),
  };
}

/** Emit directly on the core's private emitter — used to cover the binding's
 *  error-payload routing branches without replicating the full render pipeline. */
function emitInternal(designer: LabelDesigner, event: string, payload: unknown): void {
  const internal = designer as unknown as {
    emitter: { emit: (e: string, p: unknown) => void };
  };
  internal.emitter.emit(event, payload);
}

/** Run a composable inside an effect scope so onScopeDispose can fire. */
function withScope<T>(fn: () => T): { result: T; dispose: () => void } {
  const scope = effectScope();
  const result = scope.run(fn)!;
  return {
    result,
    dispose: () => {
      scope.stop();
    },
  };
}

/** Mount a designer + composable with rendering stubbed; return everything needed. */
function setup(options: Parameters<typeof useLabelDesigner>[0] = {}): {
  designer: LabelDesigner;
  api: DesignerComposableReturn;
  renderBitmap: ReturnType<typeof vi.fn>;
  dispose: () => void;
} {
  const designer =
    options.designer ?? new LabelDesigner(options.canvas ? { canvas: options.canvas } : {});
  const renderBitmap = vi.spyOn(designer, 'renderToBitmap').mockResolvedValue(fakeBitmap());
  const { result, dispose } = withScope(() =>
    useLabelDesigner({ ...options, designer, renderOnMount: options.renderOnMount ?? false }),
  );
  return {
    designer,
    api: result,
    renderBitmap: renderBitmap as unknown as ReturnType<typeof vi.fn>,
    dispose,
  };
}

describe('useLabelDesigner (vue)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('constructs a designer when none is provided', () => {
    const { result, dispose } = withScope(() =>
      useLabelDesigner({ canvas: { widthDots: 400, heightDots: 200 }, renderOnMount: false }),
    );
    expect(result.designer).toBeInstanceOf(LabelDesigner);
    expect(result.document.value.canvas.widthDots).toBe(400);
    dispose();
  });

  it('reuses an externally-provided designer', () => {
    const designer = new LabelDesigner({ canvas: { widthDots: 300, heightDots: 150 } });
    const { result, dispose } = withScope(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );
    expect(result.designer).toBe(designer);
    dispose();
  });

  it('shallowRef document updates after add() even though object identity is stable', async () => {
    const { designer, api, dispose } = setup();
    const before = api.document.value;
    const seen: unknown[] = [];
    // Subscribe to reactivity by re-reading .value after a microtask following the event.
    api.add(textInput());
    await nextTick();
    seen.push(api.document.value);
    expect(designer.document.objects).toHaveLength(1);
    // Same object reference (core mutates in place) — binding must still have surfaced it.
    expect(api.document.value).toBe(before);
    expect(seen[0]).toBe(designer.document);
    dispose();
  });

  it('updates canUndo / canRedo across mutations and history changes', () => {
    const { api, dispose } = setup();
    expect(api.canUndo.value).toBe(false);
    api.add(textInput());
    expect(api.canUndo.value).toBe(true);
    expect(api.canRedo.value).toBe(false);
    api.undo();
    expect(api.canRedo.value).toBe(true);
    dispose();
  });

  it('renders on change with a 200ms debounce', async () => {
    const { api, renderBitmap, dispose } = setup();
    api.add(textInput());
    expect(renderBitmap).not.toHaveBeenCalled();
    // advance short of debounce: still not called
    await vi.advanceTimersByTimeAsync(199);
    expect(renderBitmap).not.toHaveBeenCalled();
    // advance past debounce: one call
    await vi.advanceTimersByTimeAsync(1);
    await vi.runAllTimersAsync();
    expect(renderBitmap).toHaveBeenCalledTimes(1);
    expect(api.bitmap.value).not.toBeNull();
    dispose();
  });

  it('coalesces rapid changes into a single render', async () => {
    const { api, renderBitmap, dispose } = setup();
    api.add(textInput());
    api.add(textInput());
    api.add(textInput());
    await vi.advanceTimersByTimeAsync(200);
    await vi.runAllTimersAsync();
    expect(renderBitmap).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('discards stale render results via generation counter', async () => {
    const designer = new LabelDesigner();
    let resolveFirst: ((v: LabelBitmap) => void) | undefined;
    const firstBitmap = fakeBitmap(1, 1);
    const secondBitmap = fakeBitmap(2, 2);

    vi.spyOn(designer, 'renderToBitmap')
      .mockImplementationOnce(
        () =>
          new Promise<LabelBitmap>(resolve => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(secondBitmap);

    const { result, dispose } = withScope(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );

    result.add(textInput());
    await vi.advanceTimersByTimeAsync(200); // triggers first render (in-flight)
    result.add(textInput());
    await vi.advanceTimersByTimeAsync(200); // triggers second render
    // Now resolve the stale first one after the second has already completed.
    await vi.runAllTimersAsync();
    resolveFirst?.(firstBitmap);
    await vi.runAllTimersAsync();

    // bitmap should reflect the second render, not the stale first.
    expect(result.bitmap.value).toBe(secondBitmap);
    dispose();
  });

  it('isRendering toggles around the render cycle', async () => {
    const designer = new LabelDesigner();
    let resolveRender: ((v: LabelBitmap) => void) | undefined;
    vi.spyOn(designer, 'renderToBitmap').mockImplementation(
      () =>
        new Promise<LabelBitmap>(resolve => {
          resolveRender = resolve;
        }),
    );
    const { result, dispose } = withScope(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );

    expect(result.isRendering.value).toBe(false);
    result.add(textInput());
    await vi.advanceTimersByTimeAsync(200);
    expect(result.isRendering.value).toBe(true);
    resolveRender?.(fakeBitmap());
    await vi.runAllTimersAsync();
    expect(result.isRendering.value).toBe(false);
    dispose();
  });

  it('routes RenderWarning payloads to renderWarning', () => {
    const { designer, api, dispose } = setup();
    emitInternal(designer, 'error', {
      code: 'opacity',
      message: 'opacity ignored on 1bpp render',
    });
    expect(api.renderWarning.value?.code).toBe('opacity');
    expect(api.renderError.value).toBeNull();
    dispose();
  });

  it('routes Error instances to renderError', () => {
    const { designer, api, dispose } = setup();
    emitInternal(designer, 'error', new Error('boom'));
    expect(api.renderError.value?.message).toBe('boom');
    dispose();
  });

  it('captures render failures as renderError', async () => {
    const designer = new LabelDesigner();
    vi.spyOn(designer, 'renderToBitmap').mockRejectedValue(new Error('render failed'));
    const { result, dispose } = withScope(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );
    result.add(textInput());
    await vi.advanceTimersByTimeAsync(200);
    await vi.runAllTimersAsync();
    expect(result.renderError.value?.message).toBe('render failed');
    expect(result.isRendering.value).toBe(false);
    dispose();
  });

  it('auto-prunes selection when a selected object is removed', async () => {
    const { api, dispose } = setup();
    const a = api.add(textInput({ content: 'A' }));
    const b = api.add(textInput({ content: 'B' }));
    api.select([a, b]);
    expect(api.selection.value).toEqual([a, b]);

    api.remove(a);
    await nextTick();
    expect(api.selection.value).toEqual([b]);
    dispose();
  });

  it('select / deselect update the selection ref', () => {
    const { api, dispose } = setup();
    const a = api.add(textInput({ content: 'A' }));
    api.select([a]);
    expect(api.selection.value).toEqual([a]);
    api.deselect();
    expect(api.selection.value).toEqual([]);
    dispose();
  });

  it('renderOnMount=true kicks off an initial render', async () => {
    const designer = new LabelDesigner();
    const spy = vi.spyOn(designer, 'renderToBitmap').mockResolvedValue(fakeBitmap());
    const { dispose } = withScope(() => useLabelDesigner({ designer, renderOnMount: true }));
    await vi.advanceTimersByTimeAsync(200);
    await vi.runAllTimersAsync();
    expect(spy).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('render() forces an immediate render bypassing the debounce', async () => {
    const { api, renderBitmap, dispose } = setup();
    api.add(textInput());
    // debounce pending but not elapsed
    await api.render();
    expect(renderBitmap).toHaveBeenCalledTimes(1);
    // advancing now should not trigger another call because the scheduled timer was cleared.
    await vi.advanceTimersByTimeAsync(300);
    await vi.runAllTimersAsync();
    expect(renderBitmap).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('cleans up event listeners and pending timers on scope dispose', async () => {
    const { designer, api, renderBitmap, dispose } = setup();
    api.add(textInput());
    dispose();
    // Post-dispose: pending debounce timer is cleared, new changes no-op.
    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();
    expect(renderBitmap).not.toHaveBeenCalled();
    designer.add(textInput());
    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();
    expect(renderBitmap).not.toHaveBeenCalled();
  });

  it('exposes exports that use the designer document + assetLoader', () => {
    const { api, dispose } = setup();
    expect(typeof api.exportPng).toBe('function');
    expect(typeof api.exportPdf).toBe('function');
    expect(typeof api.exportSheet).toBe('function');
    expect(typeof api.exportBundled).toBe('function');
    dispose();
  });

  it('displayWidthDots / displayHeightDots swap when orientation is horizontal', () => {
    const designer = new LabelDesigner({
      canvas: { widthDots: 600, heightDots: 300 },
    });
    const { result, dispose } = withScope(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );
    expect(result.displayWidthDots.value).toBe(600);
    expect(result.displayHeightDots.value).toBe(300);
    designer.setOrientation('horizontal');
    expect(result.displayWidthDots.value).toBe(300);
    expect(result.displayHeightDots.value).toBe(600);
    dispose();
  });
});

describe('displayDimensions', () => {
  it('returns canonical dims for vertical', () => {
    expect(displayDimensions({ widthDots: 300, heightDots: 600, orientation: 'vertical' })).toEqual(
      { displayWidthDots: 300, displayHeightDots: 600 },
    );
  });

  it('swaps axes for horizontal', () => {
    expect(
      displayDimensions({ widthDots: 300, heightDots: 600, orientation: 'horizontal' }),
    ).toEqual({ displayWidthDots: 600, displayHeightDots: 300 });
  });

  it('preserves the unbounded sentinel for continuous + horizontal', () => {
    // Continuous label: heightDots === 0 means "growth axis is unbounded".
    // After swap, the unbounded axis becomes the displayed width.
    expect(displayDimensions({ widthDots: 300, heightDots: 0, orientation: 'horizontal' })).toEqual(
      { displayWidthDots: 0, displayHeightDots: 300 },
    );
  });

  it('treats missing orientation as vertical', () => {
    expect(displayDimensions({ widthDots: 100, heightDots: 200 })).toEqual({
      displayWidthDots: 100,
      displayHeightDots: 200,
    });
  });
});
