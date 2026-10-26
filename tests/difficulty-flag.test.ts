// tests/difficulty-flag.test.ts
// Test cho feature flag difficultyRamp (SPEC v0.4: R6, E11)
// Cờ là tham số của logic (mặc định true), logic không tự đọc FLAGS.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  currentPipeSpeed,
  update,
  PHYSICS_STEP,
  State,
  Input,
} from "../src/logic/index";

function createStateAtScore(score: number, overrides: Partial<State> = {}): State {
  return {
    bird: { y: 300, vy: 0 },
    pipes: [],
    score,
    status: "playing",
    t: 0,
    accumulator: 0,
    rng: () => 0.5,
    ...overrides,
  };
}

const noFlap: Input = { flap: false };

describe("Feature flag difficultyRamp (SPEC v0.4)", () => {
  describe("currentPipeSpeed", () => {
    it("E11.1: flag off keeps 160 px/s at every score", () => {
      expect(currentPipeSpeed(0, false)).toBeCloseTo(160, 9);
      expect(currentPipeSpeed(9, false)).toBeCloseTo(160, 9);
      expect(currentPipeSpeed(10, false)).toBeCloseTo(160, 9);
      expect(currentPipeSpeed(50, false)).toBeCloseTo(160, 9);
    });

    it("E11.2: flag on behaves exactly like R6", () => {
      expect(currentPipeSpeed(9, true)).toBeCloseTo(160, 9);
      expect(currentPipeSpeed(10, true)).toBeCloseTo(184, 9);
      expect(currentPipeSpeed(50, true)).toBeCloseTo(184, 9);
    });

    it("E11.3: omitting the flag defaults to on", () => {
      expect(currentPipeSpeed(10)).toBeCloseTo(184, 9);
    });

    it("E11.4: property - flag off always gives 160 for any score", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 10_000 }), (score) => {
          return Math.abs(currentPipeSpeed(score, false) - 160) < 1e-9;
        }),
      );
    });
  });

  describe("update", () => {
    it("E11.5: flag off, score 10 moves pipes by 160/60 per step", () => {
      const state = createStateAtScore(10, {
        pipes: [{ x: 300, gapY: 300, scored: false }],
      });
      const next = update(state, noFlap, PHYSICS_STEP, { difficultyRamp: false });

      expect(300 - next.pipes[0].x).toBeCloseTo(160 / 60, 9);
    });

    it("E11.6: flag off, a pipe scored past 10 keeps 160/60 on the next step", () => {
      const state = createStateAtScore(9, {
        pipes: [{ x: 28, gapY: 300, scored: false }],
      });
      const options = { difficultyRamp: false };
      const afterThreshold = update(state, noFlap, PHYSICS_STEP, options);
      expect(afterThreshold.score).toBe(10);

      const afterNext = update(afterThreshold, noFlap, PHYSICS_STEP, options);
      expect(
        afterThreshold.pipes[0].x - afterNext.pipes[0].x,
      ).toBeCloseTo(160 / 60, 9);
    });

    it("E11.7: flag on moves pipes by 184/60 at score 10", () => {
      const state = createStateAtScore(10, {
        pipes: [{ x: 300, gapY: 300, scored: false }],
      });
      const next = update(state, noFlap, PHYSICS_STEP, { difficultyRamp: true });

      expect(300 - next.pipes[0].x).toBeCloseTo(184 / 60, 9);
    });

    it("E11.8: omitting options equals flag on", () => {
      const state = createStateAtScore(10, {
        pipes: [{ x: 300, gapY: 300, scored: false }],
      });
      const withoutOptions = update(state, noFlap, PHYSICS_STEP);
      const withFlagOn = update(state, noFlap, PHYSICS_STEP, {
        difficultyRamp: true,
      });

      expect(withoutOptions.pipes.map((p) => p.x)).toEqual(
        withFlagOn.pipes.map((p) => p.x),
      );
      expect(withoutOptions.bird).toEqual(withFlagOn.bird);
      expect(withoutOptions.score).toBe(withFlagOn.score);
    });

    it("E11.9: flag off below the threshold is identical to flag on", () => {
      const state = createStateAtScore(5, {
        pipes: [{ x: 300, gapY: 300, scored: false }],
      });
      const off = update(state, noFlap, PHYSICS_STEP, { difficultyRamp: false });
      const on = update(state, noFlap, PHYSICS_STEP, { difficultyRamp: true });

      expect(off.pipes.map((p) => p.x)).toEqual(on.pipes.map((p) => p.x));
    });

    it("E11.10: update stays a pure function of its options (input state not mutated)", () => {
      const state = createStateAtScore(10, {
        pipes: [{ x: 300, gapY: 300, scored: false }],
      });
      update(state, noFlap, PHYSICS_STEP, { difficultyRamp: false });

      expect(state.pipes[0].x).toBe(300);
      expect(state.score).toBe(10);
    });
  });
});
