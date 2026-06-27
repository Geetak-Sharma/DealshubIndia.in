import { ICacheProvider, CacheEntry } from '../CacheProvider';

class LRUNode<T> {
  key: string;
  entry: CacheEntry<T>;
  prev: LRUNode<T> | null = null;
  next: LRUNode<T> | null = null;

  constructor(key: string, entry: CacheEntry<T>) {
    this.key = key;
    this.entry = entry;
  }
}

export class MemoryCacheProvider implements ICacheProvider {
  private map: Map<string, LRUNode<any>> = new Map();
  private head: LRUNode<any> | null = null;
  private tail: LRUNode<any> | null = null;
  
  private maxItems: number;
  private maxMemoryBytes: number;
  private currentBytes: number = 0;

  constructor(maxItems: number = 500, maxMemoryBytes: number = 50 * 1024 * 1024) { // 50MB default
    this.maxItems = maxItems;
    this.maxMemoryBytes = maxMemoryBytes;
  }

  private removeNode(node: LRUNode<any>) {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;

    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;

    node.prev = null;
    node.next = null;
  }

  private addToHead(node: LRUNode<any>) {
    if (!this.head) {
      this.head = node;
      this.tail = node;
    } else {
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    }
  }

  private evictLRU() {
    if (!this.tail) return;
    const lruKey = this.tail.key;
    const lruBytes = this.tail.entry.estimatedBytes || 0;
    
    this.removeNode(this.tail);
    this.map.delete(lruKey);
    this.currentBytes -= lruBytes;
  }

  get<T>(key: string): CacheEntry<T> | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;

    // Refresh recency
    this.removeNode(node);
    this.addToHead(node);

    return node.entry as CacheEntry<T>;
  }

  set<T>(key: string, entry: CacheEntry<T>): void {
    const estimatedBytes = entry.estimatedBytes || JSON.stringify(entry.data).length;
    entry.estimatedBytes = estimatedBytes;

    if (this.map.has(key)) {
      const existingNode = this.map.get(key)!;
      this.currentBytes -= (existingNode.entry.estimatedBytes || 0);
      existingNode.entry = entry;
      this.currentBytes += estimatedBytes;

      this.removeNode(existingNode);
      this.addToHead(existingNode);
    } else {
      const newNode = new LRUNode(key, entry);
      this.map.set(key, newNode);
      this.addToHead(newNode);
      this.currentBytes += estimatedBytes;
    }

    // Enforce limits
    while (this.map.size > this.maxItems || this.currentBytes > this.maxMemoryBytes) {
      this.evictLRU();
    }
  }

  delete(key: string): void {
    const node = this.map.get(key);
    if (node) {
      this.currentBytes -= (node.entry.estimatedBytes || 0);
      this.removeNode(node);
      this.map.delete(key);
    }
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.map.keys()) {
      if (key.startsWith(prefix)) this.delete(key);
    }
  }

  deleteByTag(tag: string): void {
    for (const [key, node] of this.map.entries()) {
      if (node.entry.tags && node.entry.tags.includes(tag)) {
        this.delete(key);
      }
    }
  }

  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
    this.currentBytes = 0;
  }

  keys(): string[] {
    return Array.from(this.map.keys());
  }
  
  // Expose current size for testing
  getStats() {
    return { count: this.map.size, bytes: this.currentBytes };
  }
}
