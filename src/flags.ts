// src/flags.ts
// Feature flag đọc lúc build (SPEC v0.4, Section 14). Nằm NGOÀI src/logic:
// logic không import file này, cờ được truyền vào như tham số.

export const FLAGS = {
  // Chỉ "false" mới tắt R6; không đặt, rỗng hay "true" đều bật.
  difficultyRamp: import.meta.env.VITE_FLAG_DIFFICULTY_RAMP !== "false",
} as const;
