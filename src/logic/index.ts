// src/logic/index.ts
// Hàm thuần – KHÔNG import DOM/Canvas (AGENTS.md)

import type { DeathCause } from "./log";

export * from "./log";

export type Status = "ready" | "playing" | "over";

export interface Pipe {
  x: number;
  gapY: number; // tọa độ tâm khoảng hở; phải thuộc [80, 520]
  scored: boolean; // true sau khi đã cộng điểm 1 lần (R4)
}

export interface State {
  bird: { y: number; vy: number };
  pipes: Pipe[];
  score: number;
  status: Status;
  t: number; // thời gian game (s), tăng khi status === 'playing'
  accumulator: number; // tích luỹ dt dư cho fixed-timestep physics (ADR-001)
  rng: () => number; // PRNG có seed – tạo gapY cho pipe mới (E5)
}

export interface Input {
  flap: boolean; // true nếu có ≥1 input trong frame; chỉ lấy 1 lần (E4)
}

export const GRAVITY = 1800;
export const FLAP_VELOCITY = -420;
export const PIPE_SPEED = 160;
export const SPEED_UP_SCORE = 10;
export const SPEED_UP_FACTOR = 1.15;
export const PIPE_WIDTH = 52;
export const PIPE_GAP = 160;
export const BIRD_X = 80;
export const BIRD_RADIUS = 12;
export const PHYSICS_STEP = 1 / 60;
export const FLOOR_Y = 600;
export const CEILING_Y = 0;
export const BIRD_START_Y = 280;
export const FIRST_PIPE_X = 400;
export const PIPE_SPACING = 220;
export const MAX_FRAME_DT = 0.05;
export const MIN_GAP_Y = 80;
export const MAX_GAP_Y = 520;

/** Tùy chọn cho update; cờ được truyền vào, logic không tự đọc FLAGS (SPEC R6). */
export interface UpdateOptions {
  difficultyRamp?: boolean;
}

export function currentPipeSpeed(score: number, difficultyRamp = true): number {
  return difficultyRamp && score >= SPEED_UP_SCORE
    ? PIPE_SPEED * SPEED_UP_FACTOR
    : PIPE_SPEED;
}

/** Tạo PRNG mulberry32 từ seed số nguyên (deterministic, E5). */
export function createRng(seed: number): () => number {
  let s = seed >>> 0;
  const fn = function (): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  (fn as unknown as { clone: () => () => number }).clone = () => createRng(s);
  return fn;
}

function cloneRng(rng: () => number): () => number {
  if (
    "clone" in rng &&
    typeof (rng as { clone: unknown }).clone === "function"
  ) {
    return (rng as { clone: () => () => number }).clone();
  }
  return rng;
}

/** Trả về state ban đầu (status = 'ready'). */
export function initialState(seed: number): State {
  return {
    bird: { y: BIRD_START_Y, vy: 0 },
    pipes: [],
    score: 0,
    status: "ready",
    t: 0,
    accumulator: 0,
    rng: createRng(seed),
  };
}

function circleIntersectsAABB(
  cx: number,
  cy: number,
  r: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): boolean {
  const closestX = Math.max(minX, Math.min(cx, maxX));
  const closestY = Math.max(minY, Math.min(cy, maxY));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < r * r;
}

/** Ống đang va chạm với bird: ống trên, ống dưới, hoặc không có. */
function pipeCollisionSide(
  birdY: number,
  pipes: readonly Pipe[],
): "top" | "bottom" | null {
  const halfGap = PIPE_GAP / 2;
  for (const pipe of pipes) {
    const minX = pipe.x;
    const maxX = pipe.x + PIPE_WIDTH;
    if (
      circleIntersectsAABB(
        BIRD_X,
        birdY,
        BIRD_RADIUS,
        minX,
        0,
        maxX,
        pipe.gapY - halfGap,
      )
    ) {
      return "top";
    }
    if (
      circleIntersectsAABB(
        BIRD_X,
        birdY,
        BIRD_RADIUS,
        minX,
        pipe.gapY + halfGap,
        maxX,
        FLOOR_Y,
      )
    ) {
      return "bottom";
    }
  }
  return null;
}

function checkPipeCollision(birdY: number, pipes: readonly Pipe[]): boolean {
  return pipeCollisionSide(birdY, pipes) !== null;
}

/**
 * Nguyên nhân thua của một state `over` (SPEC R7). Ưu tiên trần, rồi đất, rồi ống.
 * Dùng ≤ / ≥ vì E1 và E6 đặt y đúng biên khi chết.
 */
export function deathCause(state: State): DeathCause {
  const y = state.bird.y;
  if (y - BIRD_RADIUS <= CEILING_Y) return "ceiling";
  if (y + BIRD_RADIUS >= FLOOR_Y) return "floor";
  // State `over` hợp lệ luôn có một ống va chạm; nhánh dự phòng không ném lỗi.
  return pipeCollisionSide(y, state.pipes) === "top"
    ? "pipe_top"
    : "pipe_bottom";
}

function spawnPipesIfNeeded(pipes: Pipe[], rng: () => number): void {
  const spawnGapY = MIN_GAP_Y + rng() * (MAX_GAP_Y - MIN_GAP_Y);
  if (pipes.length === 0) {
    pipes.push({ x: FIRST_PIPE_X, gapY: spawnGapY, scored: false });
  } else if (pipes[pipes.length - 1].x <= FIRST_PIPE_X - PIPE_SPACING) {
    pipes.push({ x: FIRST_PIPE_X, gapY: spawnGapY, scored: false });
  }
}

function checkBoundaryCollision(bird: { y: number; vy: number }): Status {
  if (bird.y - BIRD_RADIUS < CEILING_Y) {
    bird.y = CEILING_Y + BIRD_RADIUS;
    bird.vy = 0;
    return "over";
  }
  if (bird.y + BIRD_RADIUS > FLOOR_Y) {
    bird.y = FLOOR_Y - BIRD_RADIUS;
    return "over";
  }
  return "playing";
}

function updateScoring(pipes: Pipe[]): number {
  let scoreGained = 0;
  for (const pipe of pipes) {
    if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X) {
      pipe.scored = true;
      scoreGained += 1;
    }
  }
  return scoreGained;
}

function stepSimulation(
  bird: { y: number; vy: number },
  pipes: Pipe[],
  rng: () => number,
  pipeSpeed: number,
): { status: Status; scoreGained: number } {
  spawnPipesIfNeeded(pipes, rng);
  bird.vy += GRAVITY * PHYSICS_STEP;
  bird.y += bird.vy * PHYSICS_STEP;
  for (const pipe of pipes) {
    pipe.x -= pipeSpeed * PHYSICS_STEP;
  }
  const boundaryStatus = checkBoundaryCollision(bird);
  if (boundaryStatus === "over" || checkPipeCollision(bird.y, pipes)) {
    return { status: "over", scoreGained: 0 };
  }
  const scoreGained = updateScoring(pipes);
  return { status: "playing", scoreGained };
}

/**
 * Hàm cập nhật state thuần (immutable).
 *
 * @param state   State hiện tại.
 * @param input   Input đã deduplicate trong frame (E4).
 * @param dtFrame dt thực của frame (giây), chưa clamp – hàm này tự clamp ≤ 0.05 s (E2).
 * @returns       State mới sau khi áp dụng fixed-timestep physics, collision, scoring.
 */
export function update<T extends State>(
  state: T,
  input: Input,
  dtFrame: number,
  options: UpdateOptions = {},
): T {
  const difficultyRamp = options.difficultyRamp ?? true;
  if (state.status !== "playing") {
    return { ...state };
  }
  const bird = { ...state.bird };
  if (input.flap) {
    bird.vy = FLAP_VELOCITY;
  }
  let pipes = state.pipes.map((p) => ({ ...p }));
  let score = state.score;
  pipes = pipes.filter((p) => p.x + PIPE_WIDTH >= 0);
  let status: Status = checkBoundaryCollision(bird);
  if (status === "over" || checkPipeCollision(bird.y, pipes)) {
    return { ...state, bird, pipes, score, status: "over" as Status };
  }
  const rng = cloneRng(state.rng);
  let accumulator =
    state.accumulator + Math.min(Math.max(dtFrame, 0), MAX_FRAME_DT);
  let t = state.t;
  while (accumulator >= PHYSICS_STEP - Number.EPSILON && status === "playing") {
    accumulator -= PHYSICS_STEP;
    if (accumulator < 0 && accumulator > -Number.EPSILON) accumulator = 0;
    t += PHYSICS_STEP;
    const stepPipeSpeed = currentPipeSpeed(score, difficultyRamp);
    const stepResult = stepSimulation(bird, pipes, rng, stepPipeSpeed);
    status = stepResult.status;
    score += stepResult.scoreGained;
    pipes = pipes.filter((p) => p.x + PIPE_WIDTH >= 0);
  }
  return { ...state, bird, pipes, score, status, t, accumulator, rng };
}
