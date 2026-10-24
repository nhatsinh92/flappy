# Test Matrix – Flappy Bird Logic

> Phạm vi: `src/logic/index.ts` — chỉ hàm thuần, không DOM/Canvas.
> Chưa viết code test; đây là kế hoạch.

---

## 1. `createRng(seed)`

| # | Loại | Input | Expected | Luật/EC |
|---|---|---|---|---|
| C1 | Happy path | `seed = 42` | Trả về hàm; gọi 3 lần cho 3 số `∈ [0, 1)` | E5 |
| C2 | Idempotency | Tạo 2 RNG cùng `seed = 42`, gọi mỗi cái 5 lần | Hai dãy số giống hệt nhau | E5 |
| C3 | Biên seed | `seed = 0` | Không throw; trả về chuỗi hợp lệ | E5 |
| C4 | Biên seed | `seed = 2^32 - 1` (max uint32) | Không throw; trả về chuỗi hợp lệ | E5 |
| C5 | Đường lỗi | Hai seed khác nhau (`42` vs `43`) | Dãy số khác nhau (xác suất cao) | E5 |

---

## 2. `initialState(seed)`

| # | Loại | Input | Expected | Luật/EC |
|---|---|---|---|---|
| I1 | Happy path | `seed = 1` | `status = 'ready'`, `score = 0`, `t = 0`, `accumulator = 0` | — |
| I2 | Happy path | `seed = 1` | `bird.y = 280` (birdStartY), `bird.vy = 0` | — |
| I3 | Happy path | `seed = 1` | `pipes = []` (chưa spawn khi `ready`) | Sec 7 |
| I4 | Idempotency | `initialState(42)` gọi 2 lần | Hai state giống hệt nhau | E5 |
| I5 | Happy path | `seed = 42` | `state.rng` là hàm, gọi 1 lần trả số `∈ [0, 1)` | E5, R5 |

---

## 3. `update(state, input, dtFrame)` — R1: Physics

| # | Loại | State | Input | dtFrame | Expected | Luật/EC |
|---|---|---|---|---|---|---|
| P1 | Happy path | `{y:300, vy:0}` playing | no flap | `1/60` | `vy = 30`, `y = 300.5` — semi-implicit: y dùng vy_new=30 | R1 |
| P2 | Happy path | `{y:300, vy:30}` playing | no flap | `1/60` | `vy = 60`, `y = 301` — semi-implicit: y_new=300+60×(1/60) | R1 |
| P3 | Biên dt | any playing | no flap | `0` | `vy`, `y` không đổi (0 bước physics) | R1 |
| P4 | Biên dt | any playing | no flap | `1/60` chính xác | Đúng 1 bước physics chạy | R1 |
| P5 | Biên dt | any playing | no flap | `0.05` (3 bước) | Đúng 3 bước physics, accumulator ≈ 0 | R1, E2 |
| P6 | Biên dt | any playing | no flap | `1.0` (tab quay lại) | Clamp xuống `0.05`, chỉ 3 bước tối đa | E2 |
| P7 | Biên dt | any playing | no flap | `0.049` | 2 bước (floor(0.049 / (1/60)) = 2) | R1 |
| P8 | Status guard | any `ready` | no flap | `1/60` | `bird.y`, `vy`, `t` không đổi | Sec 3 |
| P9 | Status guard | any `over` | no flap | `1/60` | Toàn bộ state không đổi | Sec 3 |
| P10 | Idempotency | any `over` | bất kỳ | bất kỳ | State trả về `===` state đầu vào (hoặc deep-equal) | Sec 3 |

---

## 4. `update` — R2: Flap

| # | Loại | State | Input | Expected | Luật/EC |
|---|---|---|---|---|---|
| F1 | Happy path | `{vy: 100}` playing | `flap: true` | `vy = -420` (flapVelocity, ghi đè) | R2 |
| F2 | Happy path | `{vy: -420}` playing | `flap: true` | `vy = -420` (idempotent nếu đang ở đỉnh) | R2 |
| F3 | Biên | `{vy: -999}` playing | `flap: true` | `vy = -420` (không cộng, chỉ ghi đè) | R2 |
| F4 | Status guard | any `ready` | `flap: true` | `vy` không đổi, status không đổi | Sec 3 |
| F5 | Status guard | any `over` | `flap: true` | `vy` không đổi | Sec 3 |
| F6 | E4 – dedup | `flap: true` (đã dedup bởi caller) | nhiều bấm | Chỉ 1 flap được xử lý | E4 |

---

## 5. `update` — R3: Collision & Death

| # | Loại | Điều kiện | Expected | Cause | Luật/EC |
|---|---|---|---|---|---|
| D1 | Biên trần | `bird.y - 12 < 0` sau bước physics | `status = 'over'`, `bird.y = 12` | `'ceiling'` | R3, E1 |
| D2 | Biên trần (trong) | `bird.y = 12 + ε` sau bước | `status` giữ `'playing'` | — | R3, E1 |
| D3 | Biên đất | `bird.y + 12 > 600` sau bước physics | `status = 'over'`, `bird.y = 588` | `'floor'` | R3, E6 |
| D4 | Biên đất (trong) | `bird.y = 588 - ε` sau bước | `status` giữ `'playing'` | — | R3, E6 |
| D5 | Va chạm ống trên | bird circle giao với ống phía trên | `status = 'over'` | `'pipe'` | R3 |
| D6 | Va chạm ống dưới | bird circle giao với ống phía dưới | `status = 'over'` | `'pipe'` | R3 |
| D7 | Bay qua gap đúng | bird.y ∈ [gapY-80+12, gapY+80-12] | `status` giữ `'playing'` | — | R3 |
| D8 | Anti-tunneling | `dtFrame = 0.05`, bird rất nhanh | Collision phát hiện trong bước physics, không xuyên qua | E7 |
| D9 | Collision sau flap | flap gần trần → `vy = -420` → y vượt 0 | Detect `ceiling`, không cho y < 0 | R3, E1 |

---

## 6. `update` — R4: Scoring

| # | Loại | Điều kiện | Expected | Luật/EC |
|---|---|---|---|---|
| S1 | Happy path | `birdX (80)` vừa vượt `pipe.x + 52` | `score += 1`, `pipe.scored = true` | R4 |
| S2 | Không cộng 2 lần | Pipe đã có `scored = true` | `score` không tăng thêm | R4, Sec 8 |
| S3 | Biên trigger | `birdX = pipe.x + 52 - 1` (chưa vượt) | `score` không tăng | R4 |
| S4 | Biên trigger | `birdX = pipe.x + 52` (đúng boundary) | `score += 1` | R4 |
| S5 | Nhiều pipe | 3 pipe, bird đi qua tất cả | `score = 3`, mỗi pipe `scored = true` | R4 |
| S6 | Invariant | Bất kỳ sequence update nào | `score` không bao giờ giảm | Sec 9 |

---

## 7. Pipe lifecycle

| # | Loại | Điều kiện | Expected | Luật/EC |
|---|---|---|---|---|
| PL1 | Spawn đầu | Transition `ready → playing` | Pipe đầu spawn tại `x = 400` | Sec 7 |
| PL2 | Spawn tiếp | Pipe cuối đạt `x = 180` | Pipe mới spawn tại `x = 400` | Sec 7 |
| PL3 | Xoá pipe | `pipe.x + 52 < 0` | Pipe bị loại khỏi mảng | Sec 7 |
| PL4 | gapY bounds | Bất kỳ pipe nào | `80 ≤ gapY ≤ 520` (invariant) | Sec 9 |
| PL5 | Không spawn khi over | `status = 'over'` | Không có pipe mới | Sec 3 |

---

## 8. Determinism & E-series tổng hợp

| # | Loại | Kịch bản | Expected | Luật/EC |
|---|---|---|---|---|
| DET1 | E3 – framerate | Chạy 3 s ở 60Hz (180 frame × dt=1/60) vs 144Hz (432 frame × dt=1/144) | `bird.y`, `score` giống nhau sau 3 s | E3 |
| DET2 | E5 – replay | Cùng seed + cùng chuỗi `(input, dtFrame)` chạy 2 lần | State cuối deep-equal | E5 |
| DET3 | E2 + E5 | Chèn `dtFrame = 1.0` vào chuỗi | E5 **không** đảm bảo (documented caveat) | E2, E5 |

---

## 9. Architecture boundary — R5

> Kiểm tra ranh giới `src/logic` ↔ `src/render` ↔ `src/index.ts` (ADR-002).
> Các test này chạy ở cấp độ static-analysis / import-check, không cần browser.

| # | Loại | Kịch bản | Expected | Luật/EC |
|---|---|---|---|---|
| A1 | Happy path | Import toàn bộ `src/logic/index.ts` trong Node.js thuần (không jsdom) | Không throw; các hàm export được | R5 |
| A2 | Negative | `src/logic/index.ts` không được chứa `import ... from 'document'\|'window'\|'HTMLCanvasElement'` | Lint rule / grep assert 0 match | R5 |
| A3 | Negative | `src/logic/index.ts` không được `import` bất kỳ file nào trong `src/render/` | Dependency-check assert 0 match | R5 |
| A4 | Happy path | Hàm `update()` nhận `GameState` thuần, trả `GameState` thuần — không side-effect DOM | Vitest chạy OK trong Node.js | R5 |
| A5 | Negative | `src/render/` không được chứa game logic (physics, collision, scoring) | Code-review checklist; không có assertion số | R5 |

---

## Tổng quan độ phủ

| Nhóm | Happy | Biên | Lỗi/Negative | Idempotency | Tổng |
|---|---|---|---|---|---|
| `createRng` | C1 | C3–C4 | C5 | C2 | 5 |
| `initialState` | I1–I3, I5 | — | — | I4 | 5 |
| `update` R1 physics | P1–P2 | P3–P7 | — | P8–P10 | 10 |
| `update` R2 flap | F1–F3 | — | F4–F5 | F6 | 6 |
| `update` R3 collision | D7 | D1–D4 | D5–D6 | D8–D9 | 9 |
| `update` R4 scoring | S1 | S3–S4 | S2 | S5–S6 | 6 |
| Pipe lifecycle | PL1–PL2 | PL4 | — | PL3, PL5 | 5 |
| Determinism/E-series | DET2 | DET1 | DET3 | — | 3 |
| Architecture R5 | A1, A4 | — | A2–A3, A5 | — | 5 |
| **Tổng** | | | | | **54** |

---

## Ghi chú thay đổi

| Phiên bản | Thay đổi |
|---|---|
| v1 (ban đầu) | 48 test case (C, I, P, F, D, S, PL, DET) |
| v2 (SPEC v0.2) | **P1**: fix y=300→**300.5**; **P2**: fix y=300.5→**301** (semi-implicit Euler theo R1); thêm **I5** (rng field); thêm **A1–A5** (R5 architecture boundary). Tổng: 54 |
