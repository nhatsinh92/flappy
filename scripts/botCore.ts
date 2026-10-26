// scripts/botCore.ts
// Bot headless: gọi thẳng update() của src/logic (hàm thuần) để tạo log (Mốc 5, bước 2).
// Không import node/DOM để test được trong vitest; phần ghi file nằm ở scripts/bot.ts.
// Xác định (E5): cùng seed và tùy chọn thì cùng kết quả.

import {
  PHYSICS_STEP,
  BIRD_RADIUS,
  BIRD_X,
  PIPE_WIDTH,
  createRng,
  currentPipeSpeed,
  deathCause,
  initialState,
  update,
  type DeathEvent,
  type State,
} from "../src/logic/index";

export interface BotOptions {
  games: number;
  seed: number;
  difficultyRamp: boolean;
  /** Số frame tối đa mỗi ván; hết mà chưa thua thì tính là sống sót. Mặc định 3600 (60 s). */
  maxFrames?: number;
}

export interface BotResult {
  events: DeathEvent[];
  survived: number;
}

const DEFAULT_MAX_FRAMES = 3600;

interface Policy {
  bias: number; // lệch so với tâm khe ống (px): người chơi giỏi/dở khác nhau
  errorRate: number; // xác suất mỗi frame quyết định ngẫu nhiên thay vì theo tính toán
  rng: () => number;
}

function makePolicy(seed: number, gameIndex: number): Policy {
  const rng = createRng((Math.imul(seed + 1, 2654435761) + gameIndex) >>> 0);
  return {
    bias: (rng() - 0.5) * 200,
    errorRate: rng() * 0.08,
    rng,
  };
}

function targetY(state: State): number {
  const next = state.pipes.find(
    (pipe) => pipe.x + PIPE_WIDTH + BIRD_RADIUS >= BIRD_X,
  );
  return next ? next.gapY : 300;
}

function decideFlap(state: State, policy: Policy): boolean {
  if (policy.rng() < policy.errorRate) {
    return policy.rng() < 0.5;
  }
  const projectedY = state.bird.y + state.bird.vy * 0.1;
  return projectedY > targetY(state) + policy.bias;
}

function playOneGame(
  gameSeed: number,
  policy: Policy,
  difficultyRamp: boolean,
  maxFrames: number,
): DeathEvent | null {
  let state: State = { ...initialState(gameSeed), status: "playing" };
  for (let frame = 0; frame < maxFrames; frame++) {
    state = update(
      state,
      { flap: decideFlap(state, policy) },
      PHYSICS_STEP,
      { difficultyRamp },
    );
    if (state.status === "over") {
      return {
        type: "death",
        cause: deathCause(state),
        score: state.score,
        t: state.t,
        pipeSpeed: currentPipeSpeed(state.score, difficultyRamp),
        difficultyRamp,
      };
    }
  }
  return null;
}

export function runBot(options: BotOptions): BotResult {
  const { games, seed, difficultyRamp } = options;
  const maxFrames = options.maxFrames ?? DEFAULT_MAX_FRAMES;
  const events: DeathEvent[] = [];
  let survived = 0;
  for (let i = 0; i < games; i++) {
    const gameSeed = (seed + i) >>> 0;
    const event = playOneGame(
      gameSeed,
      makePolicy(seed, i),
      difficultyRamp,
      maxFrames,
    );
    if (event === null) {
      survived += 1;
    } else {
      events.push(event);
    }
  }
  return { events, survived };
}
