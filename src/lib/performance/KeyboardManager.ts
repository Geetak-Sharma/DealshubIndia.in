/**
 * A reusable manager for registering global keyboard shortcuts cleanly.
 */
class KeyboardManager {
  private static instance: KeyboardManager;
  private bindings: Map<string, (e: KeyboardEvent) => void> = new Map();
  private isListening: boolean = false;

  private constructor() {}

  public static getInstance(): KeyboardManager {
    if (!KeyboardManager.instance) {
      KeyboardManager.instance = new KeyboardManager();
    }
    return KeyboardManager.instance;
  }

  public register(comboId: string, condition: (e: KeyboardEvent) => boolean, callback: (e: KeyboardEvent) => void) {
    const wrappedCallback = (e: KeyboardEvent) => {
      if (condition(e)) {
        e.preventDefault();
        callback(e);
      }
    };
    this.bindings.set(comboId, wrappedCallback);

    if (!this.isListening) {
      this.startListening();
    }
  }

  public unregister(comboId: string) {
    this.bindings.delete(comboId);
    if (this.bindings.size === 0) {
      this.stopListening();
    }
  }

  private handleKeydown = (e: KeyboardEvent) => {
    this.bindings.forEach(callback => callback(e));
  };

  private startListening() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeydown);
      this.isListening = true;
    }
  }

  private stopListening() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeydown);
      this.isListening = false;
    }
  }
}

export const globalKeyManager = KeyboardManager.getInstance();
