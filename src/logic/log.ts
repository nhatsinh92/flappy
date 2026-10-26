// src/logic/log.ts
// Hàm thuần cho log sự kiện thua (SPEC R7) – KHÔNG đụng localStorage/DOM (AGENTS.md)

export type DeathCause = "floor" | "ceiling" | "pipe_top" | "pipe_bottom";

export interface DeathEvent {
  type: "death";
  cause: DeathCause;
  score: number;
  t: number;
  pipeSpeed: number;
  difficultyRamp: boolean;
}

export const LOG_KEY = "flappy.log.v1";
export const LOG_MAX_LINES = 1000;

const DEATH_CAUSES: readonly string[] = [
  "floor",
  "ceiling",
  "pipe_top",
  "pipe_bottom",
];

/** Một dòng JSON, thứ tự trường cố định theo SPEC Section 11. */
export function serializeEvent(event: DeathEvent): string {
  return JSON.stringify({
    type: event.type,
    cause: event.cause,
    score: event.score,
    t: event.t,
    pipeSpeed: event.pipeSpeed,
    difficultyRamp: event.difficultyRamp,
  });
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function toDeathEvent(value: unknown): DeathEvent | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const valid =
    v.type === "death" &&
    typeof v.cause === "string" &&
    DEATH_CAUSES.includes(v.cause) &&
    Number.isInteger(v.score) &&
    isNonNegativeNumber(v.score) &&
    isNonNegativeNumber(v.t) &&
    typeof v.pipeSpeed === "number" &&
    Number.isFinite(v.pipeSpeed) &&
    typeof v.difficultyRamp === "boolean";
  if (!valid) return null;
  return {
    type: "death",
    cause: v.cause as DeathCause,
    score: v.score as number,
    t: v.t as number,
    pipeSpeed: v.pipeSpeed as number,
    difficultyRamp: v.difficultyRamp as boolean,
  };
}

/** Đọc JSON Lines; dòng hỏng bị bỏ qua, không ném lỗi (E13). Đầu vào không tin cậy. */
export function parseLog(text: string): DeathEvent[] {
  const events: DeathEvent[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    try {
      const event = toDeathEvent(JSON.parse(line));
      if (event !== null) events.push(event);
    } catch {
      // dòng không phải JSON hợp lệ: bỏ qua
    }
  }
  return events;
}

/** Thêm một dòng vào cuối; vượt `max` thì bỏ các dòng cũ nhất (E14). Không đột biến đầu vào. */
export function appendCapped(
  lines: readonly string[],
  line: string,
  max: number,
): string[] {
  const next = [...lines, line];
  return next.length > max ? next.slice(next.length - max) : next;
}
