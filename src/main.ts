// src/main.ts
// Khởi tạo Canvas, vòng lặp game requestAnimationFrame, xử lý input (R5 / ADR-002)

import { initialState, update, type State } from "./logic/index";
import { draw } from "./render/draw";
import { createInputManager } from "./input";

const LOGIC_WIDTH = 400;
const LOGIC_HEIGHT = 600;
const MAX_FRAME_DT = 0.05; // Giới hạn dt frame tránh tunneling / spiral of death (E2)

function getSeed(): number {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const seedParam = params.get("seed");
    if (seedParam !== null && !Number.isNaN(Number(seedParam))) {
      return Number(seedParam) >>> 0;
    }
  }
  return Date.now() >>> 0;
}

// 1. Khởi tạo canvas và thêm vào DOM nếu chưa có
let canvas =
  document.querySelector<HTMLCanvasElement>("canvas#game") ??
  document.querySelector<HTMLCanvasElement>("canvas");

if (!canvas) {
  canvas = document.createElement("canvas");
  canvas.id = "game";
  document.body.appendChild(canvas);
}

const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("Không thể khởi tạo CanvasRenderingContext2D");
}

// 2. Co giãn Canvas theo devicePixelRatio & letterbox (giữ tỉ lệ 400x600)
function handleResize(): void {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;

  // Kích thước vật lý để hiển thị sắc nét trên Retina:
  canvas.width = Math.round(LOGIC_WIDTH * dpr);
  canvas.height = Math.round(LOGIC_HEIGHT * dpr);

  // Kích thước CSS theo tỉ lệ letterbox trong viewport:
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const scale = Math.min(
    windowWidth / LOGIC_WIDTH,
    windowHeight / LOGIC_HEIGHT,
  );
  const displayWidth = Math.floor(LOGIC_WIDTH * scale);
  const displayHeight = Math.floor(LOGIC_HEIGHT * scale);

  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
}

// Thiết lập style cơ bản cho body để hiển thị letterbox giữa màn hình
document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.width = "100vw";
document.body.style.height = "100vh";
document.body.style.display = "flex";
document.body.style.alignItems = "center";
document.body.style.justifyContent = "center";
document.body.style.backgroundColor = "#1a1a1a";
document.body.style.overflow = "hidden";
canvas.style.display = "block";

window.addEventListener("resize", handleResize);
handleResize();

// 3. Quản lý Input (Deduplicate trong frame: E4)
const inputManager = createInputManager();

window.addEventListener("keydown", (e: KeyboardEvent) => {
  inputManager.handleKeyDown(e);
});

canvas.addEventListener("pointerdown", (e: PointerEvent) => {
  inputManager.handlePointerDown(e);
});

window.addEventListener(
  "touchstart",
  (e: TouchEvent) => {
    inputManager.handleTouchStart(e);
  },
  { passive: false },
);

// 4. Vòng lặp game
let state: State = initialState(getSeed());
let lastTimestamp: number | null = null;

function logDeathIfNeeded(prevState: State, nextState: State): void {
  if (prevState.status === "playing" && nextState.status === "over") {
    let cause: "floor" | "ceiling" | "pipe" = "pipe";
    if (nextState.bird.y <= 12) {
      cause = "ceiling";
    } else if (nextState.bird.y >= 588) {
      cause = "floor";
    }
    console.log({
      type: "death",
      cause,
      score: nextState.score,
      t: nextState.t,
    });
  }
}

function frame(timestamp: number): void {
  if (lastTimestamp === null) {
    lastTimestamp = timestamp;
  }
  const rawDt = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  // Kẹp dt frame tối đa 0.05s (E2)
  const dtFrame = Math.min(Math.max(rawDt, 0), MAX_FRAME_DT);

  // Lấy input đã gom trong frame (E4) và reset flag cho frame kế
  const flap = inputManager.consumeFlap();

  // Xử lý chuyển trạng thái theo spec (bấm để bắt đầu / chơi lại)
  if (state.status === "ready") {
    if (flap) {
      // ready -> playing khi flap lần đầu (Section 3)
      state = { ...state, status: "playing" };
      state = update(state, { flap: true }, dtFrame);
    }
  } else if (state.status === "playing") {
    const prevState = state;
    state = update(state, { flap }, dtFrame);
    logDeathIfNeeded(prevState, state);
  } else if (state.status === "over") {
    if (flap) {
      // over -> ready khi bấm flap với seed mới (Section 3 & 7)
      state = initialState(getSeed());
    }
  }

  // Render: scale theo DPR để toạ độ logic luôn cố định 400x600
  if (ctx) {
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx, state);
    ctx.restore();
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
