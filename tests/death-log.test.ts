// tests/death-log.test.ts
// Test cho log sự kiện thua – phần hàm thuần trong src/logic (SPEC v0.5: R7, E13, E14, E15)
// API được giả định:
//   deathCause(state): DeathCause
//   serializeEvent(event): string
//   parseLog(text): DeathEvent[]
//   appendCapped(lines, line, max): string[]
//   LOG_KEY, LOG_MAX_LINES

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  appendCapped,
  currentPipeSpeed,
  deathCause,
  initialState,
  parseLog,
  serializeEvent,
  update,
  LOG_KEY,
  LOG_MAX_LINES,
  type DeathCause,
  type DeathEvent,
  type State,
} from "../src/logic/index";

const CAUSES: DeathCause[] = ["floor", "ceiling", "pipe_top", "pipe_bottom"];

function overState(overrides: Partial<State> = {}): State {
  return {
    bird: { y: 300, vy: 0 },
    pipes: [],
    score: 0,
    status: "over",
    t: 0,
    accumulator: 0,
    rng: () => 0.5,
    ...overrides,
  };
}

const sampleEvent: DeathEvent = {
  type: "death",
  cause: "pipe_top",
  score: 12,
  t: 18.4,
  pipeSpeed: 184,
  difficultyRamp: true,
};

const sampleLine =
  '{"type":"death","cause":"pipe_top","score":12,"t":18.4,"pipeSpeed":184,"difficultyRamp":true}';

const eventArb: fc.Arbitrary<DeathEvent> = fc.record({
  type: fc.constant("death" as const),
  cause: fc.constantFrom(...CAUSES),
  score: fc.integer({ min: 0, max: 1000 }),
  t: fc.integer({ min: 0, max: 1_000_000 }).map((n) => n / 100),
  pipeSpeed: fc.constantFrom(160, 184),
  difficultyRamp: fc.boolean(),
});

describe("R7 – hằng số log", () => {
  it("LOG_KEY và LOG_MAX_LINES đúng spec", () => {
    expect(LOG_KEY).toBe("flappy.log.v1");
    expect(LOG_MAX_LINES).toBe(1000);
  });
});

describe("R7 – deathCause", () => {
  it("chạm trần: y = birdRadius → ceiling", () => {
    expect(deathCause(overState({ bird: { y: 12, vy: 0 } }))).toBe("ceiling");
  });

  it("chạm đất: y = floorY − birdRadius → floor", () => {
    expect(deathCause(overState({ bird: { y: 588, vy: 0 } }))).toBe("floor");
  });

  it("đụng ống trên (y < gapY) → pipe_top", () => {
    const state = overState({
      bird: { y: 200, vy: 0 },
      pipes: [{ x: 60, gapY: 300, scored: false }],
    });
    expect(deathCause(state)).toBe("pipe_top");
  });

  it("đụng ống dưới (y ≥ gapY) → pipe_bottom", () => {
    const state = overState({
      bird: { y: 400, vy: 0 },
      pipes: [{ x: 60, gapY: 300, scored: false }],
    });
    expect(deathCause(state)).toBe("pipe_bottom");
  });

  it("chạm trần đồng thời với ống → ceiling (ưu tiên)", () => {
    const state = overState({
      bird: { y: 12, vy: 0 },
      pipes: [{ x: 60, gapY: 300, scored: false }],
    });
    expect(deathCause(state)).toBe("ceiling");
  });

  it("chạm đất đồng thời với ống → floor (ưu tiên)", () => {
    const state = overState({
      bird: { y: 588, vy: 0 },
      pipes: [{ x: 60, gapY: 300, scored: false }],
    });
    expect(deathCause(state)).toBe("floor");
  });

  it("chỉ xét ống đang va chạm, không xét ống xa", () => {
    const state = overState({
      bird: { y: 400, vy: 0 },
      pipes: [
        { x: 300, gapY: 500, scored: false }, // ống xa, bird ở phía trên khe
        { x: 60, gapY: 300, scored: false }, // ống đang va chạm, bird ở dưới khe
      ],
    });
    expect(deathCause(state)).toBe("pipe_bottom");
  });

  it("kết hợp với update: rơi xuống đất → floor", () => {
    const next = update(
      {
        ...overState({ bird: { y: 585, vy: 500 } }),
        status: "playing" as const,
      },
      { flap: false },
      1 / 60,
    );
    expect(next.status).toBe("over");
    expect(deathCause(next)).toBe("floor");
  });

  it("kết hợp với update: bay lên trần → ceiling", () => {
    const next = update(
      {
        ...overState({ bird: { y: 14, vy: -420 } }),
        status: "playing" as const,
      },
      { flap: false },
      1 / 60,
    );
    expect(next.status).toBe("over");
    expect(deathCause(next)).toBe("ceiling");
  });
});

describe("R7 – serializeEvent", () => {
  it("ra đúng một dòng theo định dạng spec Section 11", () => {
    expect(serializeEvent(sampleEvent)).toBe(sampleLine);
  });

  it("không chứa ký tự xuống dòng (property)", () => {
    fc.assert(
      fc.property(eventArb, (event) => {
        const line = serializeEvent(event);
        return !line.includes("\n") && !line.includes("\r");
      }),
    );
  });
});

describe("R7 – parseLog", () => {
  it("round-trip: parseLog(serializeEvent(e)) = [e]", () => {
    expect(parseLog(serializeEvent(sampleEvent))).toEqual([sampleEvent]);
  });

  it("round-trip nhiều sự kiện, giữ thứ tự (property)", () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 50 }), (events) => {
        const text = events.map(serializeEvent).join("\n");
        expect(parseLog(text)).toEqual(events);
      }),
    );
  });

  it("log rỗng hoặc chỉ có dòng trống → []", () => {
    expect(parseLog("")).toEqual([]);
    expect(parseLog("\n\n")).toEqual([]);
  });

  it("E13: bỏ qua dòng không phải JSON, dòng hợp lệ xung quanh vẫn đọc được", () => {
    const other: DeathEvent = { ...sampleEvent, cause: "floor", score: 3 };
    const text = [
      serializeEvent(sampleEvent),
      "đây không phải JSON",
      serializeEvent(other),
    ].join("\n");
    expect(parseLog(text)).toEqual([sampleEvent, other]);
  });

  it("E13: bỏ qua dòng bị cắt cụt", () => {
    const truncated = sampleLine.slice(0, 40);
    expect(parseLog(`${truncated}\n${sampleLine}`)).toEqual([sampleEvent]);
  });

  it.each([
    ["thiếu trường", '{"type":"death","cause":"floor","score":1,"t":1.5,"pipeSpeed":160}'],
    ["type sai", '{"type":"birth","cause":"floor","score":1,"t":1.5,"pipeSpeed":160,"difficultyRamp":true}'],
    ["cause cũ 'pipe'", '{"type":"death","cause":"pipe","score":1,"t":1.5,"pipeSpeed":160,"difficultyRamp":true}'],
    ["cause lạ", '{"type":"death","cause":"lava","score":1,"t":1.5,"pipeSpeed":160,"difficultyRamp":true}'],
    ["score là chuỗi", '{"type":"death","cause":"floor","score":"1","t":1.5,"pipeSpeed":160,"difficultyRamp":true}'],
    ["score âm", '{"type":"death","cause":"floor","score":-1,"t":1.5,"pipeSpeed":160,"difficultyRamp":true}'],
    ["score không nguyên", '{"type":"death","cause":"floor","score":1.5,"t":1.5,"pipeSpeed":160,"difficultyRamp":true}'],
    ["t âm", '{"type":"death","cause":"floor","score":1,"t":-0.1,"pipeSpeed":160,"difficultyRamp":true}'],
    ["pipeSpeed là chuỗi", '{"type":"death","cause":"floor","score":1,"t":1.5,"pipeSpeed":"160","difficultyRamp":true}'],
    ["difficultyRamp không phải boolean", '{"type":"death","cause":"floor","score":1,"t":1.5,"pipeSpeed":160,"difficultyRamp":"yes"}'],
    ["không phải object", "42"],
    ["null", "null"],
  ])("E13: bỏ qua dòng %s", (_name, badLine) => {
    expect(parseLog(`${badLine}\n${sampleLine}`)).toEqual([sampleEvent]);
  });
});

describe("R7 – appendCapped (E14)", () => {
  it("dưới giới hạn: thêm vào cuối, giữ nguyên các dòng cũ", () => {
    expect(appendCapped(["a", "b"], "c", 5)).toEqual(["a", "b", "c"]);
  });

  it("đủ giới hạn: bỏ dòng cũ nhất, giữ thứ tự", () => {
    expect(appendCapped(["a", "b", "c"], "d", 3)).toEqual(["b", "c", "d"]);
  });

  it("với LOG_MAX_LINES dòng đầy: còn đúng LOG_MAX_LINES, dòng mới ở cuối", () => {
    const full = Array.from({ length: LOG_MAX_LINES }, (_, i) => `line-${i}`);
    const next = appendCapped(full, "new", LOG_MAX_LINES);
    expect(next).toHaveLength(LOG_MAX_LINES);
    expect(next[0]).toBe("line-1");
    expect(next[next.length - 1]).toBe("new");
  });

  it("không đột biến mảng đầu vào", () => {
    const input = ["a", "b", "c"];
    appendCapped(input, "d", 3);
    expect(input).toEqual(["a", "b", "c"]);
  });

  it("property: độ dài ≤ max, dòng mới ở cuối, thứ tự các dòng giữ lại không đổi", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { maxLength: 30 }),
        fc.string(),
        fc.integer({ min: 1, max: 20 }),
        (lines, line, max) => {
          const next = appendCapped(lines, line, max);
          expect(next.length).toBeLessThanOrEqual(max);
          expect(next[next.length - 1]).toBe(line);
          const kept = next.slice(0, -1);
          expect(kept).toEqual(lines.slice(lines.length - kept.length));
        },
      ),
    );
  });
});

describe("R7 – mô phỏng ngẫu nhiên (E5, E15, invariants)", () => {
  function simulate(seed: number, flaps: boolean[]) {
    let state: State = { ...initialState(seed), status: "playing" };
    let deathTransitions = 0;
    let finalDeath: State | null = null;
    for (const flap of flaps) {
      const prev = state;
      state = update(state, { flap }, 1 / 60);
      if (prev.status === "playing" && state.status === "over") {
        deathTransitions += 1;
        finalDeath = state;
      }
    }
    return { state, deathTransitions, finalDeath };
  }

  it("mỗi ván có tối đa một lần chuyển playing → over (E15)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 600 }),
        (seed, flaps) => {
          expect(simulate(seed, flaps).deathTransitions).toBeLessThanOrEqual(1);
        },
      ),
    );
  });

  it("state lúc chết có deathCause hợp lệ", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 600 }),
        (seed, flaps) => {
          const { finalDeath } = simulate(seed, flaps);
          if (finalDeath === null) return;
          expect(CAUSES).toContain(deathCause(finalDeath));
        },
      ),
    );
  });

  it("pipeSpeed của sự kiện chết khớp currentPipeSpeed(score, difficultyRamp)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), fc.boolean(), (score, ramp) => {
        const event: DeathEvent = {
          ...sampleEvent,
          score,
          pipeSpeed: currentPipeSpeed(score, ramp),
          difficultyRamp: ramp,
        };
        expect([160, 184]).toContain(event.pipeSpeed);
        expect(parseLog(serializeEvent(event))).toEqual([event]);
      }),
    );
  });
});
