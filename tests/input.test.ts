// tests/input.test.ts
// Test E4: Deduplicate nhiều sự kiện input trong cùng một frame ở lớp input

import { describe, it, expect } from "vitest";
import { createInputManager } from "../src/input";

describe("Input Layer – E4 Multi-event Deduplication", () => {
  it("E4 real input: nhiều event (Space, Pointer, Touch) trong cùng 1 frame chỉ sinh đúng 1 flap", () => {
    const input = createInputManager();

    let spacePrevented = false;
    let pointerPrevented = false;
    let touchPrevented = false;

    // Giả lập 3 sự kiện dồn dập trong cùng một frame trước khi requestAnimationFrame xử lý
    input.handleKeyDown({
      code: "Space",
      preventDefault: () => {
        spacePrevented = true;
      },
    });
    input.handlePointerDown({
      preventDefault: () => {
        pointerPrevented = true;
      },
    });
    input.handleTouchStart({
      preventDefault: () => {
        touchPrevented = true;
      },
    });

    expect(spacePrevented).toBe(true);
    expect(pointerPrevented).toBe(true);
    expect(touchPrevented).toBe(true);

    // Frame 1: consumeFlap() phải trả về true (chỉ 1 flap duy nhất)
    const frame1Flap = input.consumeFlap();
    expect(frame1Flap).toBe(true);

    // Frame 2: khi không có event mới, consumeFlap() phải trả về false
    const frame2Flap = input.consumeFlap();
    expect(frame2Flap).toBe(false);
  });

  it("E4 real input: các phím khác ngoài Space không kích hoạt flap", () => {
    const input = createInputManager();

    let enterPrevented = false;
    const handled = input.handleKeyDown({
      code: "Enter",
      preventDefault: () => {
        enterPrevented = true;
      },
    });

    expect(handled).toBe(false);
    expect(enterPrevented).toBe(false);
    expect(input.consumeFlap()).toBe(false);
  });
});
