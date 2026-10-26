// src/deathLog.ts
// Tầng lưu trữ log sự kiện thua (SPEC R7) – nằm NGOÀI src/logic vì đụng localStorage.
// Mọi lỗi storage bị nuốt: ghi log không được làm hỏng game (E12).

import {
  appendCapped,
  LOG_KEY,
  LOG_MAX_LINES,
  parseLog,
  serializeEvent,
  type DeathEvent,
} from "./logic/index";

export interface LogStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface DeathLogger {
  record(event: DeathEvent): void;
  readAll(): DeathEvent[];
  /** Nội dung file .jsonl: chỉ các dòng hợp lệ, mỗi dòng kết thúc bằng "\n". */
  exportText(): string;
}

export function createDeathLogger(
  storage: LogStorage | null | undefined,
): DeathLogger {
  function readAll(): DeathEvent[] {
    if (!storage) return [];
    try {
      return parseLog(storage.getItem(LOG_KEY) ?? "");
    } catch {
      return [];
    }
  }

  function record(event: DeathEvent): void {
    if (!storage) return;
    try {
      // Dựng lại từ các dòng hợp lệ để dòng hỏng không chiếm chỗ trong giới hạn.
      const lines = readAll().map(serializeEvent);
      const next = appendCapped(lines, serializeEvent(event), LOG_MAX_LINES);
      storage.setItem(LOG_KEY, next.join("\n"));
    } catch {
      // đầy quota hoặc bị chặn: bỏ sự kiện này, game tiếp tục
    }
  }

  function exportText(): string {
    return readAll()
      .map((event) => `${serializeEvent(event)}\n`)
      .join("");
  }

  return { record, readAll, exportText };
}
