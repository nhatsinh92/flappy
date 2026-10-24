// src/render/draw.ts
// Hàm vẽ thuần túy Canvas 2D: chỉ ĐỌC state và render (R5 / ADR-002)

import type { State } from "../logic/index";

const LOGIC_WIDTH = 400;
const LOGIC_HEIGHT = 600;
const BIRD_X = 80;
const BIRD_RADIUS = 12;
const PIPE_WIDTH = 52;
const PIPE_GAP = 160;
const HALF_GAP = PIPE_GAP / 2; // 80px

/**
 * Vẽ toàn bộ frame trò chơi lên Canvas.
 * Hàm chỉ đọc state để hiển thị, tuyệt đối không thay đổi state hay tính toán logic.
 */
export function draw(ctx: CanvasRenderingContext2D, state: State): void {
  // 1. Xoá và vẽ nền trời
  ctx.fillStyle = "#70c5ce";
  ctx.fillRect(0, 0, LOGIC_WIDTH, LOGIC_HEIGHT);

  // 2. Vẽ các ống (pipes)
  for (const pipe of state.pipes) {
    drawPipe(ctx, pipe.x, pipe.gapY);
  }

  // 3. Vẽ mặt đất (floor tại y = 600, dải đất trang trí ở đáy)
  ctx.fillStyle = "#ded895";
  ctx.fillRect(0, 588, LOGIC_WIDTH, 12);
  ctx.fillStyle = "#73bf2e";
  ctx.fillRect(0, 584, LOGIC_WIDTH, 4);

  // 4. Vẽ chim (bird)
  drawBird(ctx, BIRD_X, state.bird.y);

  // 5. Vẽ điểm số và màn hình tương ứng với status
  if (state.status === "playing") {
    drawScore(ctx, state.score);
  } else if (state.status === "ready") {
    drawReadyScreen(ctx);
  } else if (state.status === "over") {
    drawGameOverScreen(ctx, state.score);
  }
}

function drawPipe(
  ctx: CanvasRenderingContext2D,
  pipeX: number,
  gapY: number,
): void {
  const topPipeBottom = gapY - HALF_GAP;
  const bottomPipeTop = gapY + HALF_GAP;
  const lipHeight = 24;
  const lipExtraWidth = 4;

  ctx.fillStyle = "#73bf2e";
  ctx.strokeStyle = "#558c22";
  ctx.lineWidth = 2;

  // Ống trên
  if (topPipeBottom > 0) {
    // Thân ống
    ctx.fillRect(pipeX, 0, PIPE_WIDTH, topPipeBottom);
    ctx.strokeRect(pipeX, 0, PIPE_WIDTH, topPipeBottom);

    // Miệng ống trên
    const topLipY = Math.max(0, topPipeBottom - lipHeight);
    ctx.fillRect(
      pipeX - lipExtraWidth / 2,
      topLipY,
      PIPE_WIDTH + lipExtraWidth,
      topPipeBottom - topLipY,
    );
    ctx.strokeRect(
      pipeX - lipExtraWidth / 2,
      topLipY,
      PIPE_WIDTH + lipExtraWidth,
      topPipeBottom - topLipY,
    );
  }

  // Ống dưới
  if (bottomPipeTop < LOGIC_HEIGHT) {
    const bottomPipeHeight = LOGIC_HEIGHT - bottomPipeTop;
    // Thân ống
    ctx.fillRect(pipeX, bottomPipeTop, PIPE_WIDTH, bottomPipeHeight);
    ctx.strokeRect(pipeX, bottomPipeTop, PIPE_WIDTH, bottomPipeHeight);

    // Miệng ống dưới
    ctx.fillRect(
      pipeX - lipExtraWidth / 2,
      bottomPipeTop,
      PIPE_WIDTH + lipExtraWidth,
      lipHeight,
    );
    ctx.strokeRect(
      pipeX - lipExtraWidth / 2,
      bottomPipeTop,
      PIPE_WIDTH + lipExtraWidth,
      lipHeight,
    );
  }
}

function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // Thân chim (hình tròn bán kính 12px)
  ctx.beginPath();
  ctx.arc(x, y, BIRD_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = "#facc15";
  ctx.fill();
  ctx.strokeStyle = "#ca8a04";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Mắt chim
  ctx.beginPath();
  ctx.arc(x + 4, y - 3, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 5, y - 3, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = "#000000";
  ctx.fill();

  // Mỏ chim
  ctx.beginPath();
  ctx.moveTo(x + 8, y);
  ctx.lineTo(x + 14, y + 2);
  ctx.lineTo(x + 8, y + 5);
  ctx.closePath();
  ctx.fillStyle = "#f97316";
  ctx.fill();

  // Cánh chim
  ctx.beginPath();
  ctx.ellipse(x - 4, y + 1, 5, 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#eab308";
  ctx.fill();
}

function drawScore(ctx: CanvasRenderingContext2D, score: number): void {
  ctx.font = "bold 44px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#ffffff";

  ctx.strokeText(String(score), LOGIC_WIDTH / 2, 40);
  ctx.fillText(String(score), LOGIC_WIDTH / 2, 40);
}

function drawReadyScreen(ctx: CanvasRenderingContext2D): void {
  ctx.textAlign = "center";

  // Tiêu đề
  ctx.font = "bold 38px sans-serif";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#facc15";
  ctx.strokeText("FLAPPY BIRD", LOGIC_WIDTH / 2, 160);
  ctx.fillText("FLAPPY BIRD", LOGIC_WIDTH / 2, 160);

  // Hướng dẫn
  ctx.font = "bold 18px sans-serif";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#ffffff";
  ctx.strokeText("PRESS SPACE OR TAP", LOGIC_WIDTH / 2, 360);
  ctx.fillText("PRESS SPACE OR TAP", LOGIC_WIDTH / 2, 360);

  ctx.font = "14px sans-serif";
  ctx.lineWidth = 3;
  ctx.strokeText("TO START", LOGIC_WIDTH / 2, 390);
  ctx.fillText("TO START", LOGIC_WIDTH / 2, 390);
}

function drawGameOverScreen(
  ctx: CanvasRenderingContext2D,
  score: number,
): void {
  // Lớp mờ nền
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(0, 0, LOGIC_WIDTH, LOGIC_HEIGHT);

  ctx.textAlign = "center";

  // Game over
  ctx.font = "bold 40px sans-serif";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#ef4444";
  ctx.strokeText("GAME OVER", LOGIC_WIDTH / 2, 200);
  ctx.fillText("GAME OVER", LOGIC_WIDTH / 2, 200);

  // Điểm đạt được
  ctx.font = "bold 24px sans-serif";
  ctx.lineWidth = 4;
  ctx.fillStyle = "#ffffff";
  ctx.strokeText(`SCORE: ${score}`, LOGIC_WIDTH / 2, 270);
  ctx.fillText(`SCORE: ${score}`, LOGIC_WIDTH / 2, 270);

  // Hướng dẫn chơi lại
  ctx.font = "bold 16px sans-serif";
  ctx.fillStyle = "#facc15";
  ctx.strokeText("PRESS SPACE OR TAP TO RESTART", LOGIC_WIDTH / 2, 350);
  ctx.fillText("PRESS SPACE OR TAP TO RESTART", LOGIC_WIDTH / 2, 350);
}
