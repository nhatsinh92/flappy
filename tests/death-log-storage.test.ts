// tests/death-log-storage.test.ts
// Test tầng lưu trữ log sự kiện thua – nằm NGOÀI src/logic (SPEC v0.5: R7, E12, E13, E14)
// API được giả định (module src/deathLog.ts):
//   createDeathLogger(storage): { record(event), readAll(), exportText() }
//   storage: { getItem(key): string | null; setItem(key, value): void } hoặc null/undefined

import { describe, it, expect } from "vitest";
import { createDeathLogger } from "../src/deathLog";
import {
  serializeEvent,
  LOG_KEY,
  LOG_MAX_LINES,
  type DeathEvent,
} from "../src/logic/index";

function makeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

const event = (score: number): DeathEvent => ({
  type: "death",
  cause: "floor",
  score,
  t: 1.5,
  pipeSpeed: 160,
  difficultyRamp: true,
});

describe("R7 – tầng lưu trữ", () => {
  it("record ghi đúng một dòng JSON vào LOG_KEY", () => {
    const storage = makeStorage();
    createDeathLogger(storage).record(event(1));

    expect(storage.data.get(LOG_KEY)).toBe(serializeEvent(event(1)));
  });

  it("record nối thêm, giữ các dòng cũ theo thứ tự thời gian", () => {
    const storage = makeStorage();
    const logger = createDeathLogger(storage);
    logger.record(event(1));
    logger.record(event(2));

    expect(logger.readAll()).toEqual([event(1), event(2)]);
    expect(storage.data.get(LOG_KEY)?.split("\n")).toHaveLength(2);
  });

  it("E14: log đầy thì còn đúng LOG_MAX_LINES dòng mới nhất", () => {
    const lines = Array.from({ length: LOG_MAX_LINES }, (_, i) =>
      serializeEvent(event(i)),
    );
    const storage = makeStorage({ [LOG_KEY]: lines.join("\n") });
    const logger = createDeathLogger(storage);
    logger.record(event(LOG_MAX_LINES));

    const all = logger.readAll();
    expect(all).toHaveLength(LOG_MAX_LINES);
    expect(all[0]).toEqual(event(1));
    expect(all[all.length - 1]).toEqual(event(LOG_MAX_LINES));
  });

  it("E13: readAll bỏ qua dòng hỏng, giữ dòng hợp lệ", () => {
    const text = [serializeEvent(event(1)), "rác", serializeEvent(event(2))].join("\n");
    const logger = createDeathLogger(makeStorage({ [LOG_KEY]: text }));

    expect(logger.readAll()).toEqual([event(1), event(2)]);
  });

  it("E13: exportText chỉ chứa dòng hợp lệ, mỗi dòng là JSON đủ trường", () => {
    const text = [serializeEvent(event(1)), "{hỏng", serializeEvent(event(2))].join("\n");
    const logger = createDeathLogger(makeStorage({ [LOG_KEY]: text }));

    const lines = logger.exportText().split("\n").filter((l) => l !== "");
    expect(lines).toEqual([serializeEvent(event(1)), serializeEvent(event(2))]);
  });

  it("record thêm vào log đã có dòng hỏng không làm mất dòng hợp lệ cũ", () => {
    const text = [serializeEvent(event(1)), "rác"].join("\n");
    const logger = createDeathLogger(makeStorage({ [LOG_KEY]: text }));
    logger.record(event(2));

    expect(logger.readAll()).toEqual([event(1), event(2)]);
  });
});

describe("R7 – E12: localStorage không dùng được", () => {
  it("setItem ném lỗi (đầy quota) → record không ném lỗi", () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => createDeathLogger(storage).record(event(1))).not.toThrow();
  });

  it("getItem ném lỗi (bị chặn) → readAll trả [] và exportText không ném lỗi", () => {
    const storage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => undefined,
    };
    const logger = createDeathLogger(storage);

    expect(logger.readAll()).toEqual([]);
    expect(() => logger.exportText()).not.toThrow();
  });

  it("không có storage (null / undefined) → mọi thao tác vẫn an toàn", () => {
    for (const storage of [null, undefined]) {
      const logger = createDeathLogger(storage);
      expect(() => logger.record(event(1))).not.toThrow();
      expect(logger.readAll()).toEqual([]);
      expect(logger.exportText()).toBe("");
    }
  });
});
