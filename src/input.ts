// src/input.ts
// Quản lý và gộp (deduplicate) các sự kiện input trong frame (E4)

export interface InputManager {
  triggerFlap(): void;
  consumeFlap(): boolean;
  handleKeyDown(e: { code: string; preventDefault?: () => void }): boolean;
  handlePointerDown(e?: { preventDefault?: () => void }): void;
  handleTouchStart(e?: { preventDefault?: () => void }): void;
}

export function createInputManager(): InputManager {
  let flapQueued = false;

  return {
    triggerFlap(): void {
      flapQueued = true;
    },
    consumeFlap(): boolean {
      const flap = flapQueued;
      flapQueued = false;
      return flap;
    },
    handleKeyDown(e: { code: string; preventDefault?: () => void }): boolean {
      if (e.code === "Space") {
        e.preventDefault?.();
        flapQueued = true;
        return true;
      }
      return false;
    },
    handlePointerDown(e?: { preventDefault?: () => void }): void {
      e?.preventDefault?.();
      flapQueued = true;
    },
    handleTouchStart(e?: { preventDefault?: () => void }): void {
      e?.preventDefault?.();
      flapQueued = true;
    },
  };
}
