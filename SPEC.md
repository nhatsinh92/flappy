# Flappy Bird – SPEC v0.3

> **Changelog v0.3**: Thêm luật tăng tốc ống (R6): khi `score ≥ 10`, tốc độ ống nhanh hơn 15% (160 → 184 px/s), áp dụng một lần. Làm rõ R1: ống di chuyển trong từng bước physics (trước đây chưa nêu). Thêm tham số `speedUpScore`, `speedUpFactor`, `currentPipeSpeed`; thêm ví dụ 2 ở Section 6; thêm E8–E10; cập nhật negative examples, invariants, observability, test strategy và tiêu chí chấp nhận.
>
> **Changelog v0.2**: Tích hợp quyết định kiến trúc từ ADR-001 (fixed timestep) và ADR-002 (Canvas thuần); thêm R5; thêm `accumulator` vào State; sửa lỗi ví dụ Section 6 (semi-implicit Euler); thêm Section 14 Architecture.

---

## 1. Mục tiêu / Non-goals
- Mục tiêu: game 1 nút bấm, chạy trên web, chơi được bằng chuột/phím cách/chạm.
- Non-goals: không có multiplayer, không có tài khoản, không gọi mạng.

---

## 2. Đơn vị và hệ tọa độ
- Đơn vị: px, giây; y hướng xuống (y=0 là trần, y=600 là đất).
- Màn hình logic: 400×600 px, canvas cố định, scale theo letterbox (giữ tỉ lệ, không stretch).
- Bird cố định tại **x = 80 px** (không di chuyển theo trục x).

---

## 3. State (TypeScript)

```ts
type Status = 'ready' | 'playing' | 'over';

interface GameState {
  bird:        { y: number; vy: number };
  pipes:       { x: number; gapY: number; scored: boolean }[];
  score:       number;
  status:      Status;
  t:           number;      // thời gian game (giây), tăng khi status === 'playing'
  accumulator: number;      // dt dư chưa tiêu thụ; dùng cho fixed-timestep (ADR-001)
  rng:         () => number; // PRNG có seed; được clone/forward khi spawn pipe mới (E5)
}
```

**Hành vi theo status:**

| Status    | Physics | Pipes di chuyển | Flap | Spawn pipe |
|-----------|---------|-----------------|------|------------|
| `ready`   | Tắt     | Không           | Không | Không     |
| `playing` | Bật     | Có              | Có    | Có        |
| `over`    | Tắt     | Không           | Không | Không     |

**Chuyển trạng thái:**
- `ready` → `playing`: người chơi nhấn flap lần đầu.
- `playing` → `over`: va chạm xảy ra.
- `over` → `ready`: người chơi nhấn flap hoặc click restart; **score reset về 0** (và tốc độ ống trở về 160 px/s, R6).

---

## 4. Tham số (giá trị khởi điểm)

| Tên | Giá trị | Ghi chú |
|---|---|---|
| gravity | 1800 px/s² | gia tốc rơi |
| flapVelocity | −420 px/s | vy được đặt (không cộng) khi flap |
| pipeGap | 160 px | chiều cao khoảng hở |
| pipeSpeed | 160 px/s | tốc độ ống **cơ bản** di chuyển sang trái (khi `score < speedUpScore`) |
| pipeSpacing | 220 px | khoảng cách **tâm-tới-tâm** giữa hai ống liên tiếp |
| pipeWidth | 52 px | chiều rộng ống |
| birdRadius | 12 px | bán kính va chạm (circle) |
| PHYSICS_STEP | 1/60 s | bước tích phân cố định (xem R1) |
| floorY | 600 px | y của mặt đất |
| ceilingY | 0 px | y của trần |
| birdStartY | 280 px | y khởi đầu của bird |
| firstPipeX | 400 px | x của ống đầu tiên khi spawn |
| speedUpScore | 10 | ngưỡng điểm bắt đầu tăng tốc ống (R6) |
| speedUpFactor | 1.15 | hệ số nhân tốc độ ống khi `score ≥ speedUpScore`; áp dụng **một lần** (R6) |
| currentPipeSpeed | `pipeSpeed × speedUpFactor` nếu `score ≥ speedUpScore`, ngược lại `pipeSpeed` | giá trị dẫn xuất, không lưu trong state: 160 hoặc 184 px/s |

---

## 5. Luật

- **R1 (Physics – fixed timestep, semi-implicit Euler):** Physics chạy theo bước cố định `PHYSICS_STEP` dùng accumulator pattern, **không** dùng dt thực của frame. Tích phân theo semi-implicit Euler: vy cập nhật trước, y dùng **vy mới**. Quyết định: ADR-001.
  ```
  accumulator += min(dt_frame, 0.05)        // clamp ngay tại đây (E2)
  while accumulator >= PHYSICS_STEP:
      vy += gravity * PHYSICS_STEP          // (1) update vy trước
      y  += vy * PHYSICS_STEP               // (2) update y dùng vy MỚI → semi-implicit
      for each pipe:
          pipe.x -= currentPipeSpeed * PHYSICS_STEP   // (3) ống di chuyển; tốc độ theo R6
      accumulator -= PHYSICS_STEP
  ```
  `currentPipeSpeed` được tính từ `score` tại **đầu** mỗi bước physics. Va chạm (R3) và tính điểm (R4) đều được kiểm tra sau mỗi bước physics, bên trong vòng lặp accumulator (không phải một lần mỗi frame); điểm vừa được cộng chỉ ảnh hưởng tốc độ từ bước kế tiếp.
- **R2 (Flap):** Khi nhận input flap hợp lệ (status = `playing`), đặt `vy = flapVelocity`. Không có terminal velocity.
- **R3 (Collision → over):** Dùng circle-vs-AABB để kiểm tra va chạm giữa bird (circle, bán kính `birdRadius`) và ống (AABB, width `pipeWidth`). Game over khi:
  - `y - birdRadius < ceilingY` (chạm trần), hoặc
  - `y + birdRadius > floorY` (chạm đất), hoặc
  - Bird circle giao với AABB của ống trên hoặc ống dưới.
  - Kiểm tra xảy ra sau **mỗi bước physics** bên trong vòng lặp accumulator.
- **R4 (Điểm):** Cộng 1 điểm đúng 1 lần khi **tâm bird (x = 80)** vượt qua **cạnh phải của ống** (`pipe.x + pipeWidth`). Đánh dấu bằng flag `scored: boolean` trong state pipe. Việc kiểm tra và cộng điểm diễn ra sau mỗi bước physics (xem R1), để thời điểm cộng điểm không phụ thuộc framerate (E3).
- **R5 (Architecture – phân tầng):** Code được tổ chức thành 3 layer; vi phạm ranh giới là lỗi. Quyết định: ADR-002.
  ```
  src/
    logic/    ← hàm thuần TypeScript, KHÔNG import DOM/Canvas/Window
    render/   ← Canvas 2D calls; nhận GameState, không chứa game logic
    index.ts  ← game loop; kết nối logic ↔ render ↔ input
  ```
- **R6 (Tăng tốc ống):** Tốc độ ống là hàm thuần của `score`:
  ```
  currentPipeSpeed(score) = score >= speedUpScore ? pipeSpeed * speedUpFactor : pipeSpeed
  // score < 10  → 160 px/s
  // score >= 10 → 184 px/s
  ```
  - Tăng tốc **một lần duy nhất** tại ngưỡng; không tăng lũy tiến (điểm 11, 12, … vẫn là 184 px/s).
  - Áp dụng cho **mọi** ống đang có trên màn hình, không chỉ ống mới spawn, từ bước physics kế tiếp sau khi điểm thứ 10 được cộng.
  - `pipeSpacing` giữ nguyên theo px (220 px), nên khoảng thời gian giữa hai ống giảm từ ≈ 1.375 s xuống ≈ 1.196 s. Điều kiện spawn (Section 7) dựa trên vị trí nên không đổi.
  - Không thêm field vào `GameState`: tốc độ luôn suy ra từ `score`. Vì `score` reset về 0 khi `over → ready`, ván mới tự quay về 160 px/s.
  - Chỉ ảnh hưởng tốc độ ống; gravity, flapVelocity, pipeGap, birdRadius không đổi.

---

## 6. Ví dụ vào/ra (1 physics step)

- Trước: `bird {y:300, vy:0}`, 1 bước `dt = 1/60 s`, không input.
- Bước (1): `vy_new = 0 + 1800 × (1/60) = 30 px/s`
- Bước (2): `y_new  = 300 + 30 × (1/60) = 300.5 px` ← dùng **vy mới** (semi-implicit)

> ⚠️ **v0.2 sai**: example cũ tính `y = 300 + 0×(1/60) = 300` (dùng vy cũ = explicit Euler).
> R1 quy định semi-implicit, `y_new = 300.5` là giá trị chuẩn.

**Ví dụ 2 (R1 bước 3 + R6): một ống ở `pipe.x = 300`, 1 bước physics `1/60 s`:**

| score tại đầu bước | currentPipeSpeed | pipe.x sau 1 bước |
|---|---|---|
| 9 | 160 px/s | 300 − 160/60 ≈ 297.333 |
| 10 | 184 px/s | 300 − 184/60 ≈ 296.933 |

**Ví dụ 3 (chuyển tốc độ giữa chừng):** điểm thứ 10 được cộng ở bước *k* (score: 9 → 10). Bước *k* vẫn dịch ống 160/60 px; từ bước *k+1* mới dịch 184/60 px.

---

## 7. Pipe lifecycle

- **Spawn:** Pipe đầu tiên xuất hiện tại `x = firstPipeX` (400 px) khi chuyển sang `playing`. Pipe mới spawn khi pipe cuối cùng đạt `x = firstPipeX - pipeSpacing` (180 px). Điều kiện này dựa trên vị trí, không phụ thuộc tốc độ, nên không đổi khi tăng tốc (R6).
- **gapY:** Tọa độ tâm khoảng hở. Phải thoả: `pipeGap/2 ≤ gapY ≤ floorY - pipeGap/2`, tức **80 ≤ gapY ≤ 520**, để khoảng hở nằm hoàn toàn trong màn hình.
- **Xoá:** Pipe bị xoá khỏi mảng khi `pipe.x + pipeWidth < 0`.
- **Seed ngẫu nhiên:** gapY được sinh từ PRNG có seed. Seed mặc định là `Date.now()` khi bắt đầu ván; có thể override qua query param `?seed=<number>` để đảm bảo determinism (E5).

---

## 8. Edge case (kịch bản)

- **E1:** Bird chạm trần (`y - birdRadius < 0`) → `over`; đặt `y = birdRadius`, `vy = 0`.
- **E2:** Khi tab bị ẩn rồi quay lại, `dt_frame` bị kẹp tối đa **0.05 s** (≈3 bước physics tối đa mỗi frame), tránh dịch chuyển tức thời.
- **E3:** Kết quả vật lý tương đương ở 60Hz và 144Hz nhờ fixed-timestep accumulator (R1).
- **E4:** Nhiều input trong cùng một frame = **1 flap duy nhất**; chỉ lấy input đầu tiên, bỏ qua các input tiếp theo trong cùng frame.
- **E5:** Cùng seed + cùng chuỗi input + không có tab-visibility event → cùng kết quả. (Nếu E2 clamp xảy ra, determinism không được đảm bảo.)
- **E6:** Bird chạm đất (`y + birdRadius > 600`) → `over`; đặt `y = floorY - birdRadius`.
- **E7:** Tunneling không xảy ra vì collision được kiểm tra sau mỗi bước physics nhỏ (`PHYSICS_STEP = 1/60 s`).
- **E8:** Chuyển tốc độ giữa chừng: điểm thứ 10 được cộng ở bước physics *k* thì bước *k* vẫn dùng 160 px/s, từ bước *k+1* dùng 184 px/s. Kết quả giống nhau ở mọi framerate (E3) vì việc chuyển diễn ra theo bước physics, không theo frame.
- **E9:** Sau khi tăng tốc, tunneling vẫn không xảy ra: quãng ống dịch chuyển tối đa mỗi bước là 184/60 ≈ 3.07 px, nhỏ hơn `birdRadius` (12 px) và `pipeWidth` (52 px).
- **E10:** Ván mới (`over → ready`): `score` về 0 nên `currentPipeSpeed` về 160 px/s; ống của ván mới không mang theo tốc độ của ván trước.

---

## 9. Negative examples (KHÔNG được)

- Điểm âm; cộng điểm hai lần cho một ống; gọi mạng; đọc/ghi DOM trong `src/logic`.
- Flap khi `status !== 'playing'`.
- `dt_frame` không giới hạn (gây tunneling khi tab quay lại).
- `gapY` nằm ngoài khoảng [80, 520].
- Tăng tốc ống trước khi `score ≥ 10`; tăng tốc lũy tiến (nhiều hơn một lần); tốc độ ống giảm trong cùng một ván.
- Lưu tốc độ ống thành state riêng (tốc độ phải suy ra từ `score`).
- Đổi `pipeSpacing` hoặc tham số vật lý khác khi tăng tốc.

---

## 10. Invariants

- `score` không bao giờ giảm trong một ván; reset về 0 khi bắt đầu ván mới.
- `80 ≤ gapY ≤ 520` với mọi pipe.
- Mảng `pipes` không chứa pipe đã thoát hoàn toàn khỏi màn hình bên trái.
- `currentPipeSpeed` chỉ nhận một trong hai giá trị: 160 px/s khi `score < 10`, 184 px/s khi `score ≥ 10`.
- Trong một ván, `currentPipeSpeed` không bao giờ giảm.

---

## 11. Observability

Khi thua, ghi log:
```ts
{
  type:  'death',
  cause: 'floor' | 'ceiling' | 'pipe',
  score: number,   // điểm tại thời điểm chết
  t:     number,   // thời gian game (giây) kể từ khi status='playing'
  pipeSpeed: number // currentPipeSpeed lúc chết (160 hoặc 184), để phân biệt chết trước/sau tăng tốc
}
```

---

## 12. Test strategy

- Unit cho từng luật R1–R4 và R6.
- Test cho E1–E10.
- Property-based cho invariants (score không giảm, gapY trong bounds, pipes được xoá đúng lúc).
- Test determinism: cùng seed + input sequence → cùng final state.
- Test R6: `currentPipeSpeed(9) = 160`, `currentPipeSpeed(10) = 184`, `currentPipeSpeed(11) = 184`. So sánh số thực với sai số 1e-9 (`160 × 1.15` có thể lệch ở chữ số cuối).
- Test E8: dựng state `score = 9` với ống sắp được tính điểm, chạy từng bước, kiểm tra bước chứa điểm thứ 10 dịch ống 160/60 px và bước kế tiếp dịch 184/60 px.
- Test E10: sau `over → ready`, `currentPipeSpeed = 160`.
- Property-based thêm: với seed và chuỗi input bất kỳ, `currentPipeSpeed` ∈ {160, 184} và không giảm trong một ván.

---

## 13. Tiêu chí chấp nhận

- `npm run check` xanh.
- Chơi 1 phút không lỗi.
- 60 FPS trên laptop thường (đo bằng `requestAnimationFrame` timestamp).
- Không có tunneling: bird không xuyên đất/ống ở bất kỳ framerate nào, kể cả ở tốc độ ống 184 px/s (E9).
- Chơi tới ≥ 10 điểm: ống nhanh hơn rõ rệt ngay sau điểm thứ 10; ván mới trở lại tốc độ ban đầu.

---

## 14. Architecture (từ ADR-001, ADR-002)

### Physics timestep (ADR-001) — Đã chốt

| Tiêu chí | Fixed Timestep ✅ | Variable dt |
|---|---|---|
| E3 (framerate-independent) | ✅ Guaranteed | ❌ |
| E5 (determinism) | ✅ Guaranteed | ❌ |
| Spiral of death | Mitigated bởi E2 clamp | Không có |

**Rủi ro đảo quyết định:** Nếu E5 bị loại khỏi SPEC và team không cần test determinism, variable dt đơn giản hơn đáng kể.

### Rendering (ADR-002) — Đã chốt

| Tiêu chí | Canvas thuần ✅ | Phaser 3 |
|---|---|---|
| Bundle size | ~0 KB overhead | ~1 MB |
| Test logic (Node.js, không DOM) | ✅ | ❌ Phải mock Scene |
| Dependency mới cần duyệt | Không | Có |

**Rủi ro đảo quyết định:** Scope mở rộng cần audio engine / particle system / sprite sheet → Phaser tiết kiệm hơn.

### Tác động của R6 lên kiến trúc (v0.3)

- Không cần ADR mới: R6 là luật gameplay, nằm hoàn toàn trong `src/logic` dưới dạng hàm thuần `currentPipeSpeed(score)`.
- `render/` và `index.ts` không chứa luật tăng tốc; chúng chỉ đọc `GameState`.

> Xem chi tiết lý do và checklist kiểm chứng tại [`docs/decisions.md`](docs/decisions.md).