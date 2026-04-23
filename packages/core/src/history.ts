import { type LabelDocument } from './document.js';

/**
 * Undo/redo history for label documents.
 *
 * Stores full document snapshots. Cloning uses `structuredClone` which is a
 * native deep-clone in Node 17+ and all supported browsers. Snapshots are
 * independent — mutating one has no effect on another.
 */
export class History {
  private readonly stack: LabelDocument[] = [];
  private index = -1;

  constructor(private readonly maxDepth = 100) {}

  push(doc: LabelDocument): void {
    // Drop any redo tail when a new action is pushed.
    if (this.index < this.stack.length - 1) {
      this.stack.length = this.index + 1;
    }
    this.stack.push(structuredClone(doc));
    if (this.stack.length > this.maxDepth) {
      this.stack.shift();
    } else {
      this.index = this.stack.length - 1;
    }
  }

  undo(): LabelDocument | undefined {
    if (this.index <= 0) return undefined;
    this.index -= 1;
    const snapshot = this.stack[this.index];
    return snapshot === undefined ? undefined : structuredClone(snapshot);
  }

  redo(): LabelDocument | undefined {
    if (this.index >= this.stack.length - 1) return undefined;
    this.index += 1;
    const snapshot = this.stack[this.index];
    return snapshot === undefined ? undefined : structuredClone(snapshot);
  }

  get canUndo(): boolean {
    return this.index > 0;
  }

  get canRedo(): boolean {
    return this.index < this.stack.length - 1;
  }

  clear(): void {
    this.stack.length = 0;
    this.index = -1;
  }

  get size(): number {
    return this.stack.length;
  }
}
