// tests/invariants.test.ts
// Property-based testing using fast-check for SPEC.md Section 10 (Invariants)
// Scope: Pure logic property tests for src/logic/index.ts

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { initialState, update } from "../src/logic/index";

// Arbitrary for 32-bit unsigned seed (PRNG seed, Section 7)
const seedArb = fc.integer({ min: 0, max: 0xffffffff });

// Arbitrary for frame input (deduplicated flap boolean + realistic dtFrame)
const frameInputArb = fc.record({
  flap: fc.boolean(),
  dt: fc.double({ min: 0.001, max: 0.1, noNaN: true }),
});

// Arbitrary for sequence of frame inputs
const frameInputsArb = fc.array(frameInputArb, {
  minLength: 1,
  maxLength: 100,
});

describe("SPEC.md Section 10 – Invariants (Property-based tests with fast-check)", () => {
  // -------------------------------------------------------------------------
  // Invariant 1: score không bao giờ giảm trong một ván; reset về 0 khi bắt đầu ván mới
  // -------------------------------------------------------------------------
  it("Invariant 1: score never decreases during a game session, and resets to 0 on new game", () => {
    fc.assert(
      fc.property(seedArb, frameInputsArb, (seed, frames) => {
        let state = { ...initialState(seed), status: "playing" as const };
        let previousScore = state.score;

        for (const frame of frames) {
          state = update(state, { flap: frame.flap }, frame.dt);
          expect(state.score).toBeGreaterThanOrEqual(previousScore);
          previousScore = state.score;
        }

        // Reset về 0 khi bắt đầu ván mới
        const newState = initialState(seed + 1);
        expect(newState.score).toBe(0);
      }),
      { numRuns: 50 },
    );
  });

  // -------------------------------------------------------------------------
  // Invariant 2: 80 <= gapY <= 520 với mọi pipe
  // -------------------------------------------------------------------------
  it("Invariant 2: 80 <= gapY <= 520 for every pipe at every step", () => {
    fc.assert(
      fc.property(seedArb, frameInputsArb, (seed, frames) => {
        let state = { ...initialState(seed), status: "playing" as const };

        for (const frame of frames) {
          state = update(state, { flap: frame.flap }, frame.dt);
          for (const pipe of state.pipes) {
            expect(pipe.gapY).toBeGreaterThanOrEqual(80);
            expect(pipe.gapY).toBeLessThanOrEqual(520);
          }
        }
      }),
      { numRuns: 50 },
    );
  });

  // -------------------------------------------------------------------------
  // Invariant 3: Mảng pipes không chứa pipe đã thoát hoàn toàn khỏi màn hình bên trái
  // (pipe.x + pipeWidth < 0 với pipeWidth = 52 px)
  // -------------------------------------------------------------------------
  it("Invariant 3: pipes array never contains pipes that exited completely on the left (pipe.x + 52 < 0)", () => {
    fc.assert(
      fc.property(seedArb, frameInputsArb, (seed, frames) => {
        let state = { ...initialState(seed), status: "playing" as const };

        for (const frame of frames) {
          state = update(state, { flap: frame.flap }, frame.dt);
          for (const pipe of state.pipes) {
            // SPEC Sec 7: pipe.x + pipeWidth < 0 -> bị loại khỏi mảng
            expect(pipe.x + 52).toBeGreaterThanOrEqual(0);
          }
        }
      }),
      { numRuns: 50 },
    );
  });
});
