export class PendingContextBuffer {
  private items: string[] = [];

  push(renderedText: string): void {
    this.items.push(renderedText);
  }

  flush(): string[] {
    const flushed = [...this.items];
    this.items = [];
    return flushed;
  }

  clear(): void {
    this.items = [];
  }

  get size(): number {
    return this.items.length;
  }
}
