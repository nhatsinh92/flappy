# Flappy Bird – SPEC v0.2

> **Changelog v0.2**: Làm rõ 24 điểm mơ hồ/mâu thuẫn/edge-case/giả định ngầm từ review v0.1.

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
  bird:   { y: number; vy: number };
  pipes:  { x: number; gapY: number; scored: boolean }[];
  score:  number;
  status: Status;
  t:      number;  // thời gian game (giây), tăng khi status === 'playing'
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
- `over` → `ready`: người chơi nhấn flap hoặc click restart; **score reset về 0**.

---

## 4. Tham số (giá trị khởi điểm)

| Tên | Giá trị | Ghi chú |
|---|---|---|
| gravity | 1800 px/s² | gia tốc rơi |
| flapVelocity | −420 px/s | vy được đặt (không cộng) khi flap |
| pipeGap | 160 px | chiều cao khoảng hở |
| pipeSpeed | 160 px/s | tốc độ ống di chuyển sang trái |
| pipeSpacing | 220 px | khoảng cách **tâm-tới-tâm** giữa hai ống liên tiếp |
| pipeWidth | 52 px | chiều rộng ống |
| birdRadius | 12 px | bán kính va chạm (circle) |
| PHYSICS_STEP | 1/60 s | bước tích phân cố định (xem R1) |
| floorY | 600 px | y của mặt đất |
| ceilingY | 0 px | y của trần |
| birdStartY | 280 px | y khởi đầu của bird |
| firstPipeX | 400 px | x của ống đầu tiên khi spawn |

---

## 5. Luật

- **R1 (Physics – fixed timestep):** Physics chạy theo bước cố định `PHYSICS_STEP` dùng accumulator pattern, **không** dùng dt thực của frame. Điều này đảm bảo kết quả vật lý không phụ thuộc framerate (giải E3):
  ```
  accumulator += dt_frame  (dt_frame đã clamp theo E2)
  while accumulator >= PHYSICS_STEP:
      vy += gravity * PHYSICS_STEP
      y  += vy * PHYSICS_STEP
      accumulator -= PHYSICS_STEP
  ```
- **R2 (Flap):** Khi nhận input flap hợp lệ (status = `playing`), đặt `vy = flapVelocity`. Không có terminal velocity.
- **R3 (Collision → over):** Dùng circle-vs-AABB để kiểm tra va chạm giữa bird (circle, bán kính `birdRadius`) và ống (AABB, width `pipeWidth`). Game over khi:
  - `y - birdRadius < ceilingY` (chạm trần), hoặc
  - `y + birdRadius > floorY` (chạm đất), hoặc
  - Bird circle giao với AABB của ống trên hoặc ống dưới.
  - Kiểm tra xảy ra sau **mỗi bước physics** bên trong vòng lặp accumulator.
- **R4 (Điểm):** Cộng 1 điểm đúng 1 lần khi **tâm bird (x = 80)** vượt qua **cạnh phải của ống** (`pipe.x + pipeWidth`). Đánh dấu bằng flag `scored: boolean` trong state pipe.

---

## 6. Ví dụ vào/ra (1 physics step)

- Trước: `bird {y:300, vy:0}`, 1 bước `dt = 1/60 s`, không input.
- Sau: `vy = 0 + 1800×(1/60) = 30 px/s`, `y = 300 + 0×(1/60) = 300 px`.
  _(semi-implicit Euler: vy cập nhật trước, y dùng vy cũ)_

---

## 7. Pipe lifecycle

- **Spawn:** Pipe đầu tiên xuất hiện tại `x = firstPipeX` (400 px) khi chuyển sang `playing`. Pipe mới spawn khi pipe cuối cùng đạt `x = firstPipeX - pipeSpacing` (180 px).
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

---

## 9. Negative examples (KHÔNG được)

- Điểm âm; cộng điểm hai lần cho một ống; gọi mạng; đọc/ghi DOM trong `src/logic`.
- Flap khi `status !== 'playing'`.
- `dt_frame` không giới hạn (gây tunneling khi tab quay lại).
- `gapY` nằm ngoài khoảng [80, 520].

---

## 10. Invariants

- `score` không bao giờ giảm trong một ván; reset về 0 khi bắt đầu ván mới.
- `80 ≤ gapY ≤ 520` với mọi pipe.
- Mảng `pipes` không chứa pipe đã thoát hoàn toàn khỏi màn hình bên trái.

---

## 11. Observability

Khi thua, ghi log:
```ts
{
  type:  'death',
  cause: 'floor' | 'ceiling' | 'pipe',
  score: number,   // điểm tại thời điểm chết
  t:     number    // thời gian game (giây) kể từ khi status='playing'
}
```

---

## 12. Test strategy

- Unit cho từng luật R1–R4.
- Test cho E1–E7.
- Property-based cho invariants (score không giảm, gapY trong bounds, pipes được xoá đúng lúc).
- Test determinism: cùng seed + input sequence → cùng final state.

---

## 13. Tiêu chí chấp nhận

- `npm run check` xanh.
- Chơi 1 phút không lỗi.
- 60 FPS trên laptop thường (đo bằng `requestAnimationFrame` timestamp).
- Không có tunneling: bird không xuyên đất/ống ở bất kỳ framerate nào.