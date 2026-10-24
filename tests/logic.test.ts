// tests/logic.test.ts
// Test suite for Flappy Bird logic based on docs/test-matrix.md (v2 - 54 cases)
// Scope: Pure logic tests for src/logic/index.ts

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  createRng,
  currentPipeSpeed,
  initialState,
  update,
  BIRD_RADIUS,
  PHYSICS_STEP,
  PIPE_WIDTH,
  State,
  Input,
  Pipe,
} from "../src/logic/index";

// Helper to construct a base State for isolated tests
function createBaseState(overrides: Partial<State> = {}): State {
  return {
    bird: { y: 300, vy: 0 },
    pipes: [],
    score: 0,
    status: "playing",
    t: 0,
    accumulator: 0,
    rng: () => 0.5,
    ...overrides,
  };
}

function createStateAtScore(score: number, overrides: Partial<State> = {}): State {
  return createBaseState({ ...overrides, score });
}

describe("Test Matrix – Flappy Bird Logic", () => {
  // =========================================================================
  // 1. createRng(seed) (C1 – C5)
  // =========================================================================
  describe("1. createRng(seed)", () => {
    it("C1: Happy path - seed = 42 returns function, 3 calls produce numbers in [0, 1)", () => {
      const rng = createRng(42);
      expect(typeof rng).toBe("function");
      const val1 = rng();
      const val2 = rng();
      const val3 = rng();
      for (const val of [val1, val2, val3]) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it("C2: Idempotency - two RNGs with same seed produce identical sequence", () => {
      const rng1 = createRng(42);
      const rng2 = createRng(42);
      const seq1 = Array.from({ length: 5 }, () => rng1());
      const seq2 = Array.from({ length: 5 }, () => rng2());
      expect(seq1).toEqual(seq2);
    });

    it("C3: Biên seed - seed = 0 does not throw and produces valid numbers", () => {
      expect(() => {
        const rng = createRng(0);
        const val = rng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }).not.toThrow();
    });

    it("C4: Biên seed - seed = 2^32 - 1 (max uint32) does not throw and produces valid numbers", () => {
      expect(() => {
        const rng = createRng(0xffffffff);
        const val = rng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }).not.toThrow();
    });

    it("C5: Đường lỗi - two different seeds produce different sequences", () => {
      const rng42 = createRng(42);
      const rng43 = createRng(43);
      const seq42 = Array.from({ length: 5 }, () => rng42());
      const seq43 = Array.from({ length: 5 }, () => rng43());
      expect(seq42).not.toEqual(seq43);
    });
  });

  // =========================================================================
  // 2. initialState(seed) (I1 – I5)
  // =========================================================================
  describe("2. initialState(seed)", () => {
    it('I1: Happy path - status = "ready", score = 0, t = 0, accumulator = 0', () => {
      const state = initialState(1);
      expect(state.status).toBe("ready");
      expect(state.score).toBe(0);
      expect(state.t).toBe(0);
      expect(state.accumulator).toBe(0);
    });

    it("I2: Happy path - bird.y = 280 (birdStartY), bird.vy = 0", () => {
      const state = initialState(1);
      expect(state.bird.y).toBe(280);
      expect(state.bird.vy).toBe(0);
    });

    it("I3: Happy path - pipes = [] (no pipes spawned in ready state)", () => {
      const state = initialState(1);
      expect(state.pipes).toEqual([]);
    });

    it("I4: Idempotency - initialState(42) called twice yields identical state and rng output", () => {
      const s1 = initialState(42);
      const s2 = initialState(42);
      expect(s1.bird).toEqual(s2.bird);
      expect(s1.pipes).toEqual(s2.pipes);
      expect(s1.score).toBe(s2.score);
      expect(s1.status).toBe(s2.status);
      expect(s1.t).toBe(s2.t);
      expect(s1.accumulator).toBe(s2.accumulator);
      expect(s1.rng()).toBe(s2.rng());
    });

    it("I5: Happy path - state.rng is a function returning a number in [0, 1)", () => {
      const state = initialState(42);
      expect(typeof state.rng).toBe("function");
      const val = state.rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });
  });

  // =========================================================================
  // 3. update(state, input, dtFrame) — R1: Physics (P1 – P10)
  // =========================================================================
  describe("3. update - R1: Physics", () => {
    const noFlap: Input = { flap: false };

    it("P1: Happy path - {y: 300, vy: 0} playing with dt=1/60 yields vy=30, y=300.5 (semi-implicit Euler)", () => {
      const state = createBaseState({ bird: { y: 300, vy: 0 } });
      const next = update(state, noFlap, 1 / 60);
      expect(next.bird.vy).toBeCloseTo(30, 4);
      expect(next.bird.y).toBeCloseTo(300.5, 4);
    });

    it("P2: Happy path - {y: 300, vy: 30} playing with dt=1/60 yields vy=60, y=301 (semi-implicit Euler)", () => {
      const state = createBaseState({ bird: { y: 300, vy: 30 } });
      const next = update(state, noFlap, 1 / 60);
      expect(next.bird.vy).toBeCloseTo(60, 4);
      expect(next.bird.y).toBeCloseTo(301, 4);
    });

    it("P3: Biên dt - dt = 0 results in 0 physics steps, vy and y unchanged", () => {
      const state = createBaseState({
        bird: { y: 300, vy: 50 },
        accumulator: 0,
      });
      const next = update(state, noFlap, 0);
      expect(next.bird.vy).toBe(50);
      expect(next.bird.y).toBe(300);
      expect(next.accumulator).toBe(0);
    });

    it("P4: Biên dt - dt = 1/60 exactly executes 1 physics step, accumulator = 0", () => {
      const state = createBaseState({
        bird: { y: 300, vy: 0 },
        accumulator: 0,
      });
      const next = update(state, noFlap, 1 / 60);
      expect(next.accumulator).toBeCloseTo(0, 5);
      expect(next.bird.vy).toBeCloseTo(30, 4);
    });

    it("P5: Biên dt - dt = 0.05 executes exactly 3 physics steps, accumulator ≈ 0", () => {
      const state = createBaseState({
        bird: { y: 300, vy: 0 },
        accumulator: 0,
      });
      const next = update(state, noFlap, 0.05);
      // 3 steps: vy becomes 0 + 3 * 30 = 90
      expect(next.bird.vy).toBeCloseTo(90, 4);
      expect(next.accumulator).toBeCloseTo(0, 5);
    });

    it("P6: Biên dt - dt = 1.0 (tab return) is clamped to 0.05, max 3 physics steps", () => {
      const state = createBaseState({
        bird: { y: 300, vy: 0 },
        accumulator: 0,
      });
      const next = update(state, noFlap, 1.0);
      // Clamped to 0.05 -> exactly 3 steps, vy = 90 (not 1800!)
      expect(next.bird.vy).toBeCloseTo(90, 4);
      expect(next.accumulator).toBeCloseTo(0, 5);
    });

    it("P7: Biên dt - dt = 0.049 executes 2 physics steps, accumulator retains remaining dt", () => {
      const state = createBaseState({
        bird: { y: 300, vy: 0 },
        accumulator: 0,
      });
      const next = update(state, noFlap, 0.049);
      // floor(0.049 / (1/60)) = 2 steps -> vy = 60
      expect(next.bird.vy).toBeCloseTo(60, 4);
      expect(next.accumulator).toBeCloseTo(0.049 - 2 * (1 / 60), 5);
    });

    it("P8: Status guard - ready state with dt=1/60 does not advance physics or time", () => {
      const state = createBaseState({
        status: "ready",
        bird: { y: 280, vy: 0 },
        t: 0,
      });
      const next = update(state, noFlap, 1 / 60);
      expect(next.bird.y).toBe(280);
      expect(next.bird.vy).toBe(0);
      expect(next.t).toBe(0);
    });

    it("P9: Status guard - over state with dt=1/60 does not change state", () => {
      const state = createBaseState({
        status: "over",
        bird: { y: 588, vy: 200 },
        score: 5,
        t: 10,
      });
      const next = update(state, noFlap, 1 / 60);
      expect(next.bird.y).toBe(588);
      expect(next.bird.vy).toBe(200);
      expect(next.score).toBe(5);
      expect(next.t).toBe(10);
      expect(next.status).toBe("over");
    });

    it("P10: Idempotency - over state with any input and dt returns deep equal state", () => {
      const state = createBaseState({
        status: "over",
        bird: { y: 588, vy: 0 },
        score: 3,
      });
      const next = update(state, { flap: true }, 0.5);
      expect(next.bird).toEqual(state.bird);
      expect(next.score).toBe(state.score);
      expect(next.status).toBe("over");
    });
  });

  // =========================================================================
  // 4. update — R2: Flap (F1 – F6)
  // =========================================================================
  describe("4. update - R2: Flap", () => {
    it("F1: Happy path - {vy: 100} playing with flap=true sets vy = -420 (overwritten)", () => {
      const state = createBaseState({ bird: { y: 300, vy: 100 } });
      const next = update(state, { flap: true }, 0);
      expect(next.bird.vy).toBe(-420);
    });

    it("F2: Happy path - {vy: -420} playing with flap=true keeps vy = -420", () => {
      const state = createBaseState({ bird: { y: 300, vy: -420 } });
      const next = update(state, { flap: true }, 0);
      expect(next.bird.vy).toBe(-420);
    });

    it("F3: Biên - {vy: -999} playing with flap=true overwrites to vy = -420 (not added)", () => {
      const state = createBaseState({ bird: { y: 300, vy: -999 } });
      const next = update(state, { flap: true }, 0);
      expect(next.bird.vy).toBe(-420);
    });

    it("F4: Status guard - ready state does not apply flap velocity and status remains ready", () => {
      const state = createBaseState({
        status: "ready",
        bird: { y: 280, vy: 0 },
      });
      const next = update(state, { flap: true }, 0);
      expect(next.bird.vy).toBe(0);
      expect(next.status).toBe("ready");
    });

    it("F5: Status guard - over state does not apply flap velocity", () => {
      const state = createBaseState({
        status: "over",
        bird: { y: 588, vy: 0 },
      });
      const next = update(state, { flap: true }, 0);
      expect(next.bird.vy).toBe(0);
    });

    it("F6: E4 dedup - flap=true deduplicated by caller processes exactly 1 flap", () => {
      const state = createBaseState({ bird: { y: 300, vy: 100 } });
      // Input already deduped to flap: true
      const next = update(state, { flap: true }, 0);
      expect(next.bird.vy).toBe(-420);
    });
  });

  // =========================================================================
  // 5. update — R3: Collision & Death (D1 – D9)
  // =========================================================================
  describe("5. update - R3: Collision & Death", () => {
    const noFlap: Input = { flap: false };

    it('D1: Biên trần - bird.y - 12 < 0 causes status="over" and bird.y clamped to 12', () => {
      // Starting at y = 10, vy = -100 -> after 1 step y will be < 12
      const state = createBaseState({ bird: { y: 10, vy: -100 } });
      const next = update(state, noFlap, 1 / 60);
      expect(next.status).toBe("over");
      expect(next.bird.y).toBe(12);
    });

    it("D2: Biên trần (trong) - bird.y = 12 + ε stays playing", () => {
      // bird.y = 13, vy = 0 with dt = 0 -> stays playing
      const state = createBaseState({ bird: { y: 13, vy: 0 } });
      const next = update(state, noFlap, 0);
      expect(next.status).toBe("playing");
    });

    it('D3: Biên đất - bird.y + 12 > 600 causes status="over" and bird.y clamped to 588', () => {
      // Starting near ground y = 585, vy = 300 -> after step y > 588
      const state = createBaseState({ bird: { y: 585, vy: 300 } });
      const next = update(state, noFlap, 1 / 60);
      expect(next.status).toBe("over");
      expect(next.bird.y).toBe(588);
    });

    it("D4: Biên đất (trong) - bird.y = 588 - ε stays playing", () => {
      const state = createBaseState({ bird: { y: 587, vy: 0 } });
      const next = update(state, noFlap, 0);
      expect(next.status).toBe("playing");
    });

    it('D5: Va chạm ống trên - bird circle intersects upper pipe AABB causes status="over"', () => {
      // Bird at x = 80, y = 100. Pipe at x = 70, gapY = 300 (upper pipe covers y ∈ [0, 220])
      const pipe: Pipe = { x: 70, gapY: 300, scored: false };
      const state = createBaseState({ bird: { y: 100, vy: 0 }, pipes: [pipe] });
      const next = update(state, noFlap, 0);
      expect(next.status).toBe("over");
    });

    it('D6: Va chạm ống dưới - bird circle intersects lower pipe AABB causes status="over"', () => {
      // Bird at x = 80, y = 500. Pipe at x = 70, gapY = 300 (lower pipe covers y ∈ [380, 600])
      const pipe: Pipe = { x: 70, gapY: 300, scored: false };
      const state = createBaseState({ bird: { y: 500, vy: 0 }, pipes: [pipe] });
      const next = update(state, noFlap, 0);
      expect(next.status).toBe("over");
    });

    it('D7: Bay qua gap đúng - bird within safe gap window keeps status="playing"', () => {
      // Bird at x = 80, y = 300. Pipe at x = 70, gapY = 300 (safe gap is [220, 380])
      const pipe: Pipe = { x: 70, gapY: 300, scored: false };
      const state = createBaseState({ bird: { y: 300, vy: 0 }, pipes: [pipe] });
      const next = update(state, noFlap, 0);
      expect(next.status).toBe("playing");
    });

    it("D8: Anti-tunneling (E7) - fast bird colliding with floor detected during substeps with dt=0.05", () => {
      // Fast falling bird: y = 550, vy = 1500
      const state = createBaseState({ bird: { y: 550, vy: 1500 } });
      const next = update(state, noFlap, 0.05);
      expect(next.status).toBe("over");
      expect(next.bird.y).toBe(588);
    });

    it("D9: Collision sau flap (E1) - flap near ceiling detects collision, clamping y=12", () => {
      // Flapping at y = 15 with vy = -420 would move bird past ceiling in 1 step
      const state = createBaseState({ bird: { y: 15, vy: 0 } });
      const next = update(state, { flap: true }, 1 / 60);
      expect(next.status).toBe("over");
      expect(next.bird.y).toBe(12);
    });
  });

  // =========================================================================
  // 6. update — R4: Scoring (S1 – S6)
  // =========================================================================
  describe("6. update - R4: Scoring", () => {
    const noFlap: Input = { flap: false };

    it("S1: Happy path - birdX (80) crosses right edge of pipe (pipe.x + 52) increments score and sets scored=true", () => {
      // pipe at x = 29. In dt=1/60, pipe moves left by 160*(1/60) ≈ 2.67px -> pipe.x ≈ 26.33, right edge ≈ 78.33 <= 80
      const pipe: Pipe = { x: 29, gapY: 300, scored: false };
      const state = createBaseState({ pipes: [pipe], score: 0 });
      const next = update(state, noFlap, 1 / 60);
      expect(next.score).toBe(1);
      expect(next.pipes[0].scored).toBe(true);
    });

    it("S2: Không cộng 2 lần - pipe with scored=true does not increment score again", () => {
      const pipe: Pipe = { x: 10, gapY: 300, scored: true };
      const state = createBaseState({ pipes: [pipe], score: 1 });
      const next = update(state, noFlap, 1 / 60);
      expect(next.score).toBe(1);
    });

    it("S3: Biên trigger - birdX < pipe.x + 52 (not yet passed) does not increment score", () => {
      // Right edge is 35 + 52 = 87 > 80
      const pipe: Pipe = { x: 35, gapY: 300, scored: false };
      const state = createBaseState({ pipes: [pipe], score: 0 });
      const next = update(state, noFlap, 0);
      expect(next.score).toBe(0);
      expect(next.pipes[0].scored).toBe(false);
    });

    it("S4: Biên trigger - birdX == pipe.x + 52 (exact boundary at x = 28, not yet crossed) does not increment score", () => {
      // 28 + 52 = 80 == birdX (chưa vượt qua cạnh phải)
      const pipe: Pipe = { x: 28, gapY: 300, scored: false };
      const state = createBaseState({ pipes: [pipe], score: 0 });
      const next = update(state, noFlap, 0);
      expect(next.score).toBe(0);
      expect(next.pipes[0].scored).toBe(false);
    });

    it("S4b: Biên trigger - birdX > pipe.x + 52 (pipe.x = 27.9, đã vượt qua cạnh phải) increments score", () => {
      // 27.9 + 52 = 79.9 < 80 == birdX (đã vượt qua)
      const pipe: Pipe = { x: 27.9, gapY: 300, scored: false };
      const state = createBaseState({ pipes: [pipe], score: 0 });
      const next = update(state, noFlap, PHYSICS_STEP);
      // 27.9 - 160 * (1/60) + 52 ≈ 77.233 < 80, nên tính 1 điểm sau bước.
      expect(next.score).toBe(1);
      expect(next.pipes[0].scored).toBe(true);
    });

    it("S5: Nhiều pipe - passing 3 pipes results in score = 3, each scored = true", () => {
      const pipes: Pipe[] = [
        { x: 10, gapY: 300, scored: false },
        { x: 20, gapY: 300, scored: false },
        { x: 27, gapY: 300, scored: false },
      ];
      const state = createBaseState({ pipes, score: 0 });
      const next = update(state, noFlap, PHYSICS_STEP);
      // Sau bước ở 160 px/s, các cạnh phải lần lượt là 10-160/60+52,
      // 20-160/60+52, 27-160/60+52; cả ba đều < x bird (80).
      expect(next.score).toBe(3);
      // Bước physics cũng spawn pipe kế tiếp tại x=400; pipe mới chưa qua bird.
      expect(next.pipes.slice(0, pipes.length).every((p) => p.scored)).toBe(true);
    });

    it("S6: Invariant - score never decreases across multiple updates", () => {
      let state = createBaseState({
        pipes: [{ x: 30, gapY: 300, scored: false }],
        score: 0,
      });
      let prevScore = state.score;
      for (let i = 0; i < 10; i++) {
        state = update(state, noFlap, 1 / 60);
        expect(state.score).toBeGreaterThanOrEqual(prevScore);
        prevScore = state.score;
      }
    });
  });

  // =========================================================================
  // 7. R6: Pipe speed threshold and physics-step timing
  // =========================================================================
  describe("7. R6 and E8-E10: Pipe speed", () => {
    const noFlap: Input = { flap: false };

    it("R6.1: currentPipeSpeed changes once at score 10", () => {
      expect(currentPipeSpeed(0)).toBeCloseTo(160, 9);
      expect(currentPipeSpeed(9)).toBeCloseTo(160, 9);
      expect(currentPipeSpeed(10)).toBeCloseTo(184, 9);
      expect(currentPipeSpeed(11)).toBeCloseTo(184, 9);
      expect(currentPipeSpeed(50)).toBeCloseTo(184, 9);
    });

    it("R6.2: score 10 moves every existing pipe by 184/60 in one physics step", () => {
      const state = createStateAtScore(10, {
        pipes: [
          { x: 300, gapY: 300, scored: false },
          { x: 520, gapY: 300, scored: false },
        ],
      });
      const next = update(state, noFlap, PHYSICS_STEP);

      expect(300 - next.pipes[0].x).toBeCloseTo(184 / 60, 9);
      expect(520 - next.pipes[1].x).toBeCloseTo(184 / 60, 9);
    });

    it("R6.3: high speed preserves 220 px spacing and moves a spawned pipe on the next step", () => {
      const state = createStateAtScore(10, {
        pipes: [{ x: 180, gapY: 300, scored: false }],
      });
      const afterSpawn = update(state, noFlap, PHYSICS_STEP);

      expect(afterSpawn.pipes).toHaveLength(2);
      expect(afterSpawn.pipes[1].x).toBeCloseTo(400 - 184 / 60, 9);
      expect(afterSpawn.pipes[1].x - afterSpawn.pipes[0].x).toBeCloseTo(
        220,
        9,
      );

      const afterNextStep = update(afterSpawn, noFlap, PHYSICS_STEP);
      expect(
        afterSpawn.pipes[0].x - afterNextStep.pipes[0].x,
      ).toBeCloseTo(184 / 60, 9);
      expect(
        afterSpawn.pipes[1].x - afterNextStep.pipes[1].x,
      ).toBeCloseTo(184 / 60, 9);
    });

    it("E8.1: the scoring step uses 160/60 and the following step uses 184/60", () => {
      const state = createStateAtScore(9, {
        pipes: [{ x: 28, gapY: 300, scored: false }],
      });
      const afterThresholdStep = update(state, noFlap, PHYSICS_STEP);

      expect(afterThresholdStep.score).toBe(10);
      expect(28 - afterThresholdStep.pipes[0].x).toBeCloseTo(160 / 60, 9);

      const afterFollowingStep = update(
        afterThresholdStep,
        noFlap,
        PHYSICS_STEP,
      );
      expect(
        afterThresholdStep.pipes[0].x - afterFollowingStep.pipes[0].x,
      ).toBeCloseTo(184 / 60, 9);
    });

    it("E8.2: a three-step frame matches three one-step frames and uses high speed after step one", () => {
      const state = createStateAtScore(9, {
        pipes: [{ x: 28, gapY: 300, scored: false }],
      });
      const batched = update(state, noFlap, 3 / 60);
      let stepped = state;
      for (let i = 0; i < 3; i++) {
        stepped = update(stepped, noFlap, PHYSICS_STEP);
      }

      expect(batched.score).toBe(stepped.score);
      expect(batched.bird).toEqual(stepped.bird);
      expect(batched.pipes.map((pipe) => pipe.x)).toEqual(
        stepped.pipes.map((pipe) => pipe.x),
      );
      expect(batched.score).toBe(10);
      // Step 1: 160/60; steps 2 and 3: 184/60 each.
      expect(batched.pipes[0].x).toBeCloseTo(28 - 160 / 60 - 2 * (184 / 60), 9);
    });

    it("E3-R6: the same 20 physics steps cross score 10 identically at 60Hz and 144Hz", () => {
      const start = () =>
        createStateAtScore(9, {
          pipes: [{ x: 28, gapY: 300, scored: false }],
        });
      let state60 = start();
      let state144 = start();

      for (let i = 0; i < 20; i++) {
        state60 = update(state60, noFlap, 1 / 60);
      }
      for (let i = 0; i < 48; i++) {
        state144 = update(state144, noFlap, 1 / 144);
      }

      expect(state60.score).toBe(10);
      expect(state144.score).toBe(10);
      expect(state60.bird.y).toBeCloseTo(state144.bird.y, 9);
      expect(state60.pipes.map((pipe) => pipe.x)).toHaveLength(
        state144.pipes.length,
      );
      state60.pipes.forEach((pipe, index) => {
        expect(pipe.x).toBeCloseTo(state144.pipes[index].x, 9);
      });
    });

    it("E9.1: at score 10, pipe displacement is 184/60, below birdRadius and pipeWidth", () => {
      const state = createStateAtScore(10, {
        pipes: [{ x: 300, gapY: 300, scored: false }],
      });
      const next = update(state, noFlap, PHYSICS_STEP);
      const displacement = 300 - next.pipes[0].x;

      expect(displacement).toBeCloseTo(184 / 60, 9);
      expect(displacement).toBeLessThan(BIRD_RADIUS);
      expect(displacement).toBeLessThan(PIPE_WIDTH);
    });

    it("E9.2: a pipe moving at high speed collides with the bird circle after one step", () => {
      const state = createStateAtScore(10, {
        bird: { y: 200, vy: 0 },
        pipes: [{ x: 94.8, gapY: 300, scored: false }],
      });
      const next = update(state, noFlap, PHYSICS_STEP);

      expect(next.status).toBe("over");
      expect(94.8 - next.pipes[0].x).toBeCloseTo(184 / 60, 9);
    });

    it("E10: a new ready game resets score and its first pipe step uses 160/60", () => {
      const previousGame = createStateAtScore(10, { status: "over" });
      expect(previousGame.score).toBe(10);

      const ready = initialState(42);
      expect(ready.score).toBe(0);
      expect(currentPipeSpeed(ready.score)).toBeCloseTo(160, 9);

      const playing = { ...ready, status: "playing" as const };
      const firstStep = update(playing, noFlap, PHYSICS_STEP);
      expect(firstStep.pipes).toHaveLength(1);
      expect(400 - firstStep.pipes[0].x).toBeCloseTo(160 / 60, 9);
    });

    it("R6 property: every integer score from 0 to 1000 maps to an allowed nondecreasing speed", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 1000 }), (score) => {
          const speed = currentPipeSpeed(score);
          expect([160, 184]).toContain(speed);
          if (score > 0) {
            expect(speed).toBeGreaterThanOrEqual(currentPipeSpeed(score - 1));
          }
        }),
        { numRuns: 100 },
      );
    });

    it("R6 property replay: seeded random input crosses 10 with score and speed never decreasing", () => {
      const frameInputs = fc.array(
        fc.record({
          flap: fc.boolean(),
          dt: fc.double({ min: 0.001, max: 0.05, noNaN: true }),
        }),
        { minLength: 1, maxLength: 50 },
      );

      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 0xffffffff }),
          frameInputs,
          (seed, inputs) => {
            const run = () => {
              let state = createStateAtScore(9, {
                pipes: [{ x: 28, gapY: 300, scored: false }],
                rng: createRng(seed),
              });
              let previousScore = state.score;
              let previousSpeed = currentPipeSpeed(state.score);

              state = update(state, noFlap, PHYSICS_STEP);
              expect(state.score).toBe(10);

              for (const input of inputs) {
                state = update(state, input, input.dt);
                const speed = currentPipeSpeed(state.score);
                expect(state.score).toBeGreaterThanOrEqual(previousScore);
                expect(speed).toBeGreaterThanOrEqual(previousSpeed);
                previousScore = state.score;
                previousSpeed = speed;
              }
              return state;
            };

            const first = run();
            const replay = run();
            expect(first.bird).toEqual(replay.bird);
            expect(first.pipes).toEqual(replay.pipes);
            expect(first.score).toBe(replay.score);
            expect(first.status).toBe(replay.status);
            expect(first.t).toBeCloseTo(replay.t, 9);
          },
        ),
        { numRuns: 50 },
      );
    });

    it("R4: dt=0 does not run a physics step or increase score", () => {
      const state = createStateAtScore(9, {
        pipes: [{ x: 20, gapY: 300, scored: false }],
      });
      const next = update(state, noFlap, 0);

      expect(next.score).toBe(9);
      expect(next.pipes[0].scored).toBe(false);
    });
  });

  // =========================================================================
  // 8. Pipe lifecycle (PL1 – PL5)
  // =========================================================================
  describe("7. Pipe lifecycle", () => {
    const noFlap: Input = { flap: false };

    it("PL1: Spawn đầu - when game is in playing state without pipes, first pipe spawns at x = 400", () => {
      const state = createBaseState({ pipes: [], status: "playing" });
      const next = update(state, noFlap, 1 / 60);
      expect(next.pipes.length).toBeGreaterThanOrEqual(1);
      expect(next.pipes[0].x).toBeCloseTo(400 - 160 * (1 / 60), 1);
    });

    it("PL2: Spawn tiếp - when last pipe reaches x <= 180, new pipe spawns at x = 400", () => {
      const lastPipe: Pipe = { x: 180, gapY: 300, scored: false };
      const state = createBaseState({ pipes: [lastPipe], status: "playing" });
      const next = update(state, noFlap, 1 / 60);
      expect(next.pipes.length).toBe(2);
      expect(next.pipes[next.pipes.length - 1].x).toBeCloseTo(
        400 - 160 * (1 / 60),
        1,
      );
    });

    it("PL3: Xoá pipe - pipe with x + 52 < 0 is removed from pipes array", () => {
      const pipes: Pipe[] = [
        { x: -53, gapY: 300, scored: true }, // right edge = -1 < 0 -> should be removed
        { x: 100, gapY: 300, scored: false },
      ];
      const state = createBaseState({ pipes, status: "playing" });
      const next = update(state, noFlap, 0);
      expect(next.pipes.find((p) => p.x === -53)).toBeUndefined();
      expect(next.pipes.length).toBe(1);
    });

    it("PL4: gapY bounds - all spawned pipes must have gapY in [80, 520]", () => {
      let state = createBaseState({
        pipes: [],
        status: "playing",
        rng: createRng(12345),
      });
      for (let i = 0; i < 200; i++) {
        state = update(state, noFlap, 1 / 60);
        for (const pipe of state.pipes) {
          expect(pipe.gapY).toBeGreaterThanOrEqual(80);
          expect(pipe.gapY).toBeLessThanOrEqual(520);
        }
      }
    });

    it("PL5: Không spawn khi over - over state does not spawn new pipes or move existing ones", () => {
      const pipes: Pipe[] = [{ x: 150, gapY: 300, scored: false }];
      const state = createBaseState({ pipes, status: "over" });
      const next = update(state, noFlap, 1 / 60);
      expect(next.pipes.length).toBe(1);
      expect(next.pipes[0].x).toBe(150);
    });
  });

  // =========================================================================
  // 8. Determinism & E-series (DET1 – DET3)
  // =========================================================================
  describe("8. Determinism & E-series", () => {
    it("DET1: E3 framerate independence - 3s at 60Hz vs 144Hz gives identical bird.y and score", () => {
      const seed = 999;
      let state60 = { ...initialState(seed), status: "playing" as const };
      let state144 = { ...initialState(seed), status: "playing" as const };

      // 60Hz: 180 frames of 1/60s
      for (let i = 0; i < 180; i++) {
        state60 = update(state60, { flap: false }, 1 / 60);
      }

      // 144Hz: 432 frames of 1/144s
      for (let i = 0; i < 432; i++) {
        state144 = update(state144, { flap: false }, 1 / 144);
      }

      expect(state60.bird.y).toBeCloseTo(state144.bird.y, 4);
      expect(state60.score).toBe(state144.score);
    });

    it("DET2: E5 replay - same seed + same input sequence yields deep-equal final state", () => {
      const runSimulation = (seed: number) => {
        let s = { ...initialState(seed), status: "playing" as const };
        const inputs = [
          { flap: false },
          { flap: true },
          { flap: false },
          { flap: false },
          { flap: true },
        ];
        for (const inp of inputs) {
          s = update(s, inp, 1 / 60);
        }
        return s;
      };

      const s1 = runSimulation(42);
      const s2 = runSimulation(42);

      expect(s1.bird).toEqual(s2.bird);
      expect(s1.pipes).toEqual(s2.pipes);
      expect(s1.score).toBe(s2.score);
      expect(s1.status).toBe(s2.status);
      expect(s1.t).toBeCloseTo(s2.t, 5);
      expect(s1.accumulator).toBeCloseTo(s2.accumulator, 5);
    });

    it("DET3: E2 + E5 caveat - large dtFrame=1.0 clamped to 0.05 diverges from unclamped sequence", () => {
      // 1 frame with dt=1.0 runs at most 3 physics steps due to E2 clamp (0.05)
      let clampedState = createBaseState({ bird: { y: 300, vy: 0 } });
      clampedState = update(clampedState, { flap: false }, 1.0);

      // Whereas 60 frames of 1/60s would have run 60 steps
      let normalState = createBaseState({ bird: { y: 300, vy: 0 } });
      for (let i = 0; i < 60; i++) {
        normalState = update(normalState, { flap: false }, 1 / 60);
      }

      // They intentionally diverge due to safety clamp
      expect(clampedState.bird.vy).not.toBe(normalState.bird.vy);
    });
  });

  // =========================================================================
  // 9. Architecture boundary — R5 (A1 – A4)
  // (A5 is manual review checklist, documented in test-matrix.md)
  // =========================================================================
  describe("9. Architecture boundary — R5", () => {
    it("A1: Happy path - src/logic/index.ts can be imported in pure Node.js without DOM", async () => {
      const logic = await import("../src/logic/index");
      expect(typeof logic.createRng).toBe("function");
      expect(typeof logic.initialState).toBe("function");
      expect(typeof logic.update).toBe("function");
    });

    it("A2: Negative - src/logic/index.ts must not contain DOM/window/HTMLCanvasElement references", () => {
      const logicPath = path.resolve(__dirname, "../src/logic/index.ts");
      const content = fs.readFileSync(logicPath, "utf-8");

      // Check for DOM references
      const forbiddenPatterns = [
        /\bwindow\b/,
        /\bdocument\b/,
        /\bHTMLCanvasElement\b/,
        /\bCanvasRenderingContext2D\b/,
        /\brequestAnimationFrame\b/,
      ];

      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(content)).toBe(false);
      }
    });

    it("A3: Negative - src/logic/index.ts must not import anything from src/render", () => {
      const logicPath = path.resolve(__dirname, "../src/logic/index.ts");
      const content = fs.readFileSync(logicPath, "utf-8");

      expect(content).not.toMatch(/from\s+['"][^'"]*render/);
    });

    it("A4: Happy path - update() receives pure State and returns pure State without DOM side-effects", () => {
      const state = createBaseState();
      const next = update(state, { flap: false }, 1 / 60);
      expect(typeof next).toBe("object");
      expect(next).not.toBeNull();
      // Verifies update does not mutate input state directly
      expect(state.bird.y).toBe(300);
    });

    it("A4b: Pure function - update() does not mutate state.rng of the input state", () => {
      const state = createBaseState({ pipes: [], rng: createRng(42) });
      const next1 = update(state, { flap: false }, 1 / 60);
      const next2 = update(state, { flap: false }, 1 / 60);

      // Cùng state đầu vào, hai lần update độc lập phải cho ra cùng gapY cho pipe mới
      expect(next1.pipes[0].gapY).toBe(next2.pipes[0].gapY);
      // Hai state mới độc lập phải cho ra cùng giá trị rng tiếp theo
      expect(next1.rng()).toBe(next2.rng());
    });
  });
});
