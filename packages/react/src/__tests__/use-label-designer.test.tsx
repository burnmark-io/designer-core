import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LabelDesigner,
  type LabelBitmap,
  type LabelObjectInput,
  type TextObject,
} from '@burnmark-io/designer-core';
import { useLabelDesigner, type DesignerHookOptions } from '../index.js';

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

function emitInternal(designer: LabelDesigner, event: string, payload: unknown): void {
  const internal = designer as unknown as {
    emitter: { emit: (e: string, p: unknown) => void };
  };
  internal.emitter.emit(event, payload);
}

/** Build a designer with renderToBitmap + renderPlanes stubbed, pass it into the hook. */
function stubbedDesigner(): {
  designer: LabelDesigner;
  renderBitmap: ReturnType<typeof vi.fn>;
  renderPlanes: ReturnType<typeof vi.fn>;
} {
  const designer = new LabelDesigner();
  const renderBitmap = vi.spyOn(designer, 'renderToBitmap').mockResolvedValue(fakeBitmap());
  const renderPlanes = vi
    .spyOn(designer, 'renderPlanes')
    .mockResolvedValue(new Map([['black', fakeBitmap()]]));
  return {
    designer,
    renderBitmap: renderBitmap as unknown as ReturnType<typeof vi.fn>,
    renderPlanes: renderPlanes as unknown as ReturnType<typeof vi.fn>,
  };
}

describe('useLabelDesigner (react)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('constructs a designer when none is provided', () => {
    const { result, unmount } = renderHook(() =>
      useLabelDesigner({ canvas: { widthDots: 400, heightDots: 200 }, renderOnMount: false }),
    );
    expect(result.current.designer).toBeInstanceOf(LabelDesigner);
    expect(result.current.document.canvas.widthDots).toBe(400);
    unmount();
  });

  it('reuses an externally-provided designer', () => {
    const designer = new LabelDesigner({ canvas: { widthDots: 300, heightDots: 150 } });
    const { result, unmount } = renderHook(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );
    expect(result.current.designer).toBe(designer);
    unmount();
  });

  it('does not re-initialise the designer on re-render with a new options object', () => {
    const { result, rerender, unmount } = renderHook(
      (props: DesignerHookOptions) => useLabelDesigner(props),
      { initialProps: { renderOnMount: false } },
    );
    const firstDesigner = result.current.designer;
    rerender({ canvas: { widthDots: 999 }, renderOnMount: false });
    expect(result.current.designer).toBe(firstDesigner);
    unmount();
  });

  it('re-renders after add() even though document identity is stable', () => {
    const { designer } = stubbedDesigner();
    const { result, unmount } = renderHook(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );
    const before = result.current.document;
    act(() => {
      result.current.add(textInput());
    });
    expect(result.current.document).toBe(before); // in-place mutation
    expect(result.current.document.objects).toHaveLength(1);
    unmount();
  });

  it('updates canUndo / canRedo across history events', () => {
    const { designer } = stubbedDesigner();
    const { result, unmount } = renderHook(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );
    expect(result.current.canUndo).toBe(false);
    act(() => {
      result.current.add(textInput());
    });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);
    unmount();
  });

  it('renders on change with a 200ms debounce', async () => {
    const { designer, renderBitmap } = stubbedDesigner();
    const { result, unmount } = renderHook(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );
    act(() => {
      result.current.add(textInput());
    });
    expect(renderBitmap).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(199);
    });
    expect(renderBitmap).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await vi.runAllTimersAsync();
    });
    expect(renderBitmap).toHaveBeenCalledTimes(1);
    expect(result.current.bitmap).not.toBeNull();
    unmount();
  });

  it('coalesces rapid changes into a single render', async () => {
    const { designer, renderBitmap } = stubbedDesigner();
    const { result, unmount } = renderHook(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );
    act(() => {
      result.current.add(textInput());
      result.current.add(textInput());
      result.current.add(textInput());
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
      await vi.runAllTimersAsync();
    });
    expect(renderBitmap).toHaveBeenCalledTimes(1);
    unmount();
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

    const { result, unmount } = renderHook(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );
    act(() => {
      result.current.add(textInput());
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    act(() => {
      result.current.add(textInput());
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
      await vi.runAllTimersAsync();
    });
    await act(async () => {
      resolveFirst?.(firstBitmap);
      await vi.runAllTimersAsync();
    });
    expect(result.current.bitmap).toBe(secondBitmap);
    unmount();
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
    const { result, unmount } = renderHook(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );
    expect(result.current.isRendering).toBe(false);
    act(() => {
      result.current.add(textInput());
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(result.current.isRendering).toBe(true);
    await act(async () => {
      resolveRender?.(fakeBitmap());
      await vi.runAllTimersAsync();
    });
    expect(result.current.isRendering).toBe(false);
    unmount();
  });

  it('uses renderPlanes when capabilities are provided', async () => {
    const designer = new LabelDesigner();
    vi.spyOn(designer, 'renderPlanes').mockResolvedValue(
      new Map([
        ['black', fakeBitmap(1, 1)],
        ['red', fakeBitmap(2, 2)],
      ]),
    );
    const bitmapSpy = vi.spyOn(designer, 'renderToBitmap');
    const { result, unmount } = renderHook(() =>
      useLabelDesigner({
        designer,
        capabilities: { colors: [{ name: 'black', cssMatch: ['#000'] }] },
        renderOnMount: false,
      }),
    );
    act(() => {
      result.current.add(textInput());
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
      await vi.runAllTimersAsync();
    });
    expect(bitmapSpy).not.toHaveBeenCalled();
    expect(result.current.planes?.size).toBe(2);
    expect(result.current.bitmap).toBe(result.current.planes?.get('black'));
    unmount();
  });

  it('routes RenderWarning payloads to renderWarning', () => {
    const { designer } = stubbedDesigner();
    const { result, unmount } = renderHook(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );
    act(() => {
      emitInternal(designer, 'error', {
        code: 'opacity',
        message: 'opacity ignored',
      });
    });
    expect(result.current.renderWarning?.code).toBe('opacity');
    expect(result.current.renderError).toBeNull();
    unmount();
  });

  it('routes Error instances to renderError', () => {
    const { designer } = stubbedDesigner();
    const { result, unmount } = renderHook(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );
    act(() => {
      emitInternal(designer, 'error', new Error('boom'));
    });
    expect(result.current.renderError?.message).toBe('boom');
    unmount();
  });

  it('captures render failures as renderError', async () => {
    const designer = new LabelDesigner();
    vi.spyOn(designer, 'renderToBitmap').mockRejectedValue(new Error('render failed'));
    const { result, unmount } = renderHook(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );
    act(() => {
      result.current.add(textInput());
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
      await vi.runAllTimersAsync();
    });
    expect(result.current.renderError?.message).toBe('render failed');
    expect(result.current.isRendering).toBe(false);
    unmount();
  });

  it('auto-prunes selection when a selected object is removed', () => {
    const { designer } = stubbedDesigner();
    const { result, unmount } = renderHook(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );
    let a = '';
    let b = '';
    act(() => {
      a = result.current.add(textInput({ content: 'A' }));
      b = result.current.add(textInput({ content: 'B' }));
    });
    act(() => {
      result.current.select([a, b]);
    });
    expect(result.current.selection).toEqual([a, b]);
    act(() => {
      result.current.remove(a);
    });
    expect(result.current.selection).toEqual([b]);
    unmount();
  });

  it('select / deselect update the selection state', () => {
    const { designer } = stubbedDesigner();
    const { result, unmount } = renderHook(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );
    let a = '';
    act(() => {
      a = result.current.add(textInput({ content: 'A' }));
    });
    act(() => {
      result.current.select([a]);
    });
    expect(result.current.selection).toEqual([a]);
    act(() => {
      result.current.deselect();
    });
    expect(result.current.selection).toEqual([]);
    unmount();
  });

  it('renderOnMount=true kicks off an initial render', async () => {
    const designer = new LabelDesigner();
    const spy = vi.spyOn(designer, 'renderToBitmap').mockResolvedValue(fakeBitmap());
    const { unmount } = renderHook(() => useLabelDesigner({ designer, renderOnMount: true }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
      await vi.runAllTimersAsync();
    });
    expect(spy).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('render() forces an immediate render bypassing the debounce', async () => {
    const { designer, renderBitmap } = stubbedDesigner();
    const { result, unmount } = renderHook(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );
    act(() => {
      result.current.add(textInput());
    });
    await act(async () => {
      await result.current.render();
    });
    expect(renderBitmap).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
      await vi.runAllTimersAsync();
    });
    expect(renderBitmap).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('is StrictMode safe (no double event subscriptions after mount)', async () => {
    const { designer, renderBitmap } = stubbedDesigner();
    const { result, unmount } = renderHook(
      () => useLabelDesigner({ designer, renderOnMount: false }),
      { wrapper: ({ children }) => <StrictMode>{children}</StrictMode> },
    );
    act(() => {
      result.current.add(textInput());
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
      await vi.runAllTimersAsync();
    });
    // Exactly one render despite StrictMode's double-effect-invocation.
    expect(renderBitmap).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('cleans up listeners and pending timers on unmount', async () => {
    const { designer, renderBitmap } = stubbedDesigner();
    const { result, unmount } = renderHook(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );
    act(() => {
      result.current.add(textInput());
    });
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
      await vi.runAllTimersAsync();
    });
    expect(renderBitmap).not.toHaveBeenCalled();
    designer.add(textInput());
    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();
    expect(renderBitmap).not.toHaveBeenCalled();
  });

  it('exposes export wrappers', () => {
    const { designer } = stubbedDesigner();
    const { result, unmount } = renderHook(() =>
      useLabelDesigner({ designer, renderOnMount: false }),
    );
    expect(typeof result.current.exportPng).toBe('function');
    expect(typeof result.current.exportPdf).toBe('function');
    expect(typeof result.current.exportSheet).toBe('function');
    expect(typeof result.current.exportBundled).toBe('function');
    unmount();
  });
});
