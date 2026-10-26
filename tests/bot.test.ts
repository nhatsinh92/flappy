// tests/bot.test.ts
// Test cho bot headless tạo log (Mốc 5, bước 2). Bot gọi trực tiếp update() của src/logic
// và sinh sự kiện death đúng định dạng SPEC Section 11 (R7).
// API được giả định (scripts/botCore.ts):
//   runBot({ games, seed, difficultyRamp, maxFrames? }): { events: DeathEvent[]; survived: number }

import { describe, it, expect } from "vitest";
import { runBot } from "../scripts/botCore";
import {
  currentPipeSpeed,
  parseLog,
  serializeEvent,
} from "../src/logic/index";

describe("Bot headless", () => {
  it("cùng seed và cùng tùy chọn → cùng kết quả (E5)", () => {
    const a = runBot({ games: 50, seed: 7, difficultyRamp: true });
    const b = runBot({ games: 50, seed: 7, difficultyRamp: true });

    expect(a).toEqual(b);
  });

  it("seed khác → kết quả khác", () => {
    const a = runBot({ games: 50, seed: 7, difficultyRamp: true });
    const b = runBot({ games: 50, seed: 8, difficultyRamp: true });

    expect(a.events).not.toEqual(b.events);
  });

  it("mỗi ván tạo tối đa một sự kiện: events + survived = games", () => {
    const { events, survived } = runBot({
      games: 40,
      seed: 3,
      difficultyRamp: true,
      maxFrames: 600,
    });

    expect(events.length + survived).toBe(40);
  });

  it("mọi sự kiện là dòng log hợp lệ theo spec (parseLog nhận hết)", () => {
    const { events } = runBot({ games: 100, seed: 1, difficultyRamp: true });
    const text = events.map(serializeEvent).join("\n");

    expect(events.length).toBeGreaterThan(0);
    expect(parseLog(text)).toEqual(events);
  });

  it("pipeSpeed khớp currentPipeSpeed(score, difficultyRamp) ở cả hai chế độ", () => {
    for (const difficultyRamp of [true, false]) {
      const { events } = runBot({ games: 100, seed: 5, difficultyRamp });
      for (const event of events) {
        expect(event.difficultyRamp).toBe(difficultyRamp);
        expect(event.pipeSpeed).toBeCloseTo(
          currentPipeSpeed(event.score, difficultyRamp),
          9,
        );
      }
    }
  });

  it("cờ tắt: pipeSpeed luôn là 160 (E11)", () => {
    const { events } = runBot({ games: 100, seed: 5, difficultyRamp: false });

    expect(events.every((e) => e.pipeSpeed === 160)).toBe(true);
  });

  it("dữ liệu đủ đa dạng để phân tích: có cả ván thua sớm lẫn ván qua 10 điểm", () => {
    const { events } = runBot({ games: 300, seed: 1, difficultyRamp: true });

    expect(events.some((e) => e.score < 10)).toBe(true);
    expect(events.some((e) => e.score >= 10)).toBe(true);
  });

  it("có nhiều hơn một loại nguyên nhân thua", () => {
    const { events } = runBot({ games: 300, seed: 1, difficultyRamp: true });

    expect(new Set(events.map((e) => e.cause)).size).toBeGreaterThan(1);
  });
});
