import { type DesignerEvent } from './types.js';

export type EventHandler = (payload?: unknown) => void;

export class EventEmitter {
  private readonly handlers = new Map<DesignerEvent, Set<EventHandler>>();

  on(event: DesignerEvent, handler: EventHandler): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => {
      this.off(event, handler);
    };
  }

  off(event: DesignerEvent, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: DesignerEvent, payload?: unknown): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      handler(payload);
    }
  }

  removeAll(event?: DesignerEvent): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
}
