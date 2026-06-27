export class FocusManager {
  private static previousActiveElement: HTMLElement | null = null;

  public static saveFocus() {
    if (typeof document !== 'undefined') {
      this.previousActiveElement = document.activeElement as HTMLElement;
    }
  }

  public static restoreFocus() {
    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      this.previousActiveElement.focus();
    }
    this.previousActiveElement = null;
  }

  public static trapFocus(container: HTMLElement) {
    // A simple focus trap implementation could go here in the future
    // e.g. listening to Tab and Shift+Tab inside the container
  }
}
