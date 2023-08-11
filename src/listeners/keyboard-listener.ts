export type KeyEventCallback = () => void;

export class KeyboardListener {
  private pressedKeys = new Set<string>();
  private callbacks = new Map<string, KeyEventCallback[]>();

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  public on(key: string, callback: KeyEventCallback) {
    const existing = this.callbacks.get(key) ?? [];
    if (!existing.includes(callback)) {
      existing.push(callback);
    }
    this.callbacks.set(key, existing);
  }

  public off(key: string, callback: KeyEventCallback) {
    let existing = this.callbacks.get(key);
    if (!existing) {
      return;
    }
    existing = existing.filter((cb) => cb !== callback);
    this.callbacks.set(key, existing);
  }

  public isKeyPressed(key: string) {
    return this.pressedKeys.has(key);
  }

  public anyKeysPressed(keys: string[]) {
    for (const key of keys) {
      if (this.isKeyPressed(key)) {
        return true;
      }
    }

    return false;
  }

  private readonly onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLocaleLowerCase();

    // Ensures listeners are only called once
    if (this.pressedKeys.has(key)) {
      return;
    }

    this.pressedKeys.add(key);
    this.callbacks.get(key)?.forEach((cb) => cb());
  };

  private readonly onKeyUp = (e: KeyboardEvent) => {
    this.pressedKeys.delete(e.key.toLocaleLowerCase());
  };
}
