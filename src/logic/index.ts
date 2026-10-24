// src/logic/index.ts
// Hàm thuần – KHÔNG import DOM/Canvas (AGENTS.md)

export type Status = 'ready' | 'playing' | 'over';

export interface Pipe {
    x: number;
    gapY: number;    // tọa độ tâm khoảng hở; phải thuộc [80, 520]
    scored: boolean; // true sau khi đã cộng điểm 1 lần (R4)
}

export interface State {
    bird:        { y: number; vy: number };
    pipes:       Pipe[];
    score:       number;
    status:      Status;
    t:           number;      // thời gian game (s), tăng khi status === 'playing'
    accumulator: number;      // tích luỹ dt dư cho fixed-timestep physics (ADR-001)
    rng:         () => number; // PRNG có seed – tạo gapY cho pipe mới (E5)
}

export interface Input {
    flap: boolean; // true nếu có ≥1 input trong frame; chỉ lấy 1 lần (E4)
}

/** Tạo PRNG mulberry32 từ seed số nguyên (deterministic, E5). */
export function createRng(seed: number): () => number {
    throw new Error('not implemented');
}

/**
 * Trả về state ban đầu (status = 'ready').
 * @param seed  Seed cho PRNG sinh gapY của pipe.
 */
export function initialState(seed: number): State {
    throw new Error('not implemented');
}

/**
 * Hàm cập nhật state thuần (immutable).
 *
 * @param state   State hiện tại.
 * @param input   Input đã deduplicate trong frame (E4).
 * @param dtFrame dt thực của frame (giây), chưa clamp – hàm này tự clamp ≤ 0.05 s (E2).
 * @returns       State mới sau khi áp dụng fixed-timestep physics, collision, scoring.
 */
export function update(state: State, input: Input, dtFrame: number): State {
    throw new Error('not implemented');
}