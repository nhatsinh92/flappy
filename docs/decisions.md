# Architecture Decision Records

> Định dạng mỗi ADR: **Bối cảnh → Phương án → Quyết định → Cách kiểm chứng**

---

## ADR-001 – Physics timestep: Fixed vs Variable dt

**Ngày:** 2026-10-24
**Trạng thái:** Đã chốt

### Bối cảnh

Game cần đạt hai yêu cầu đồng thời từ SPEC v0.2:

- **E3**: Kết quả vật lý tương đương trên màn hình 60Hz và 144Hz.
- **E5**: Cùng seed + cùng chuỗi input → cùng kết quả (determinism/reproducibility).

Euler integration với variable dt tích luỹ sai số khác nhau tùy framerate, khiến cả E3 lẫn E5 không thể đảm bảo về mặt toán học.

### Phương án

|                 | Fixed Timestep (accumulator)             | Variable dt            |
| --------------- | ---------------------------------------- | ---------------------- |
| Độ đơn giản     | Phức tạp hơn một chút (accumulator loop) | Đơn giản nhất          |
| Test xác định   | ✅ Guaranteed                            | ❌ Phụ thuộc framerate |
| E3 / E5         | ✅ Đảm bảo                               | ❌ Không đảm bảo       |
| Spiral of death | Có (mitigated bởi dt clamp E2)           | Không                  |

### Quyết định

**Chọn Fixed Timestep** với `PHYSICS_STEP = 1/60 s` và accumulator pattern:

```
accumulator += clamp(dt_frame, 0, 0.05)
while accumulator >= PHYSICS_STEP:
    step_physics(PHYSICS_STEP)
    accumulator -= PHYSICS_STEP
```

Spiral of death được kiểm soát bởi E2 (clamp `dt_frame ≤ 0.05 s`), giới hạn tối đa ~3 bước physics/frame.

**Điều có thể làm quyết định này sai:** Nếu E5 bị loại khỏi SPEC và team không cần test determinism, variable dt đơn giản hơn đáng kể mà không có rủi ro thực tế.

### Cách kiểm chứng

- [ ] Unit test R1: chạy cùng sequence input với `PHYSICS_STEP` cố định, assert `y` và `vy` bằng exact value.
- [ ] Test E3: simulate 100 frame ở 60Hz và 144Hz (bằng cách thay đổi `dt_frame`), assert `bird.y` cuối giống nhau.
- [ ] Test E5: replay cùng seed + input sequence hai lần, assert toàn bộ state giống hệt.
- [ ] Test E2: truyền `dt_frame = 1.0` (tab vừa quay lại), assert accumulator chỉ tạo ra ≤ 3 bước physics.

---

## ADR-002 – Rendering: Canvas thuần vs Phaser

**Ngày:** 2026-10-24
**Trạng thái:** Đã chốt

### Bối cảnh

Cần chọn lớp rendering cho game. Hai ràng buộc cứng từ AGENTS.md và SPEC:

- `src/logic` chỉ chứa hàm thuần, **không import DOM/Canvas**.
- Không thêm dependency mới khi chưa được duyệt.

Game Flappy Bird là game rất nhỏ: ~5 entity (bird, 2–3 ống, background, score). Không có tilemap, animation phức tạp, hay audio phức tạp trong SPEC hiện tại.

### Phương án

|               | Canvas thuần (HTML5)                        | Phaser 3                                    |
| ------------- | ------------------------------------------- | ------------------------------------------- |
| Độ đơn giản   | ✅ Vài trăm dòng, zero boilerplate          | ❌ Scene lifecycle, ~1MB bundle             |
| Test xác định | ✅ Logic tách hoàn toàn, Jest không cần DOM | ❌ Mock Phaser Scene rất phức tạp           |
| Hiệu năng     | ✅ Đủ dư cho 60 FPS với game này            | ⚠️ WebGL renderer nhanh hơn, nhưng overkill |
| Độ phụ thuộc  | ✅ Zero external dep                        | ❌ ~1MB, version lock-in, cần duyệt         |

### Quyết định

**Chọn Canvas thuần (HTML5 Canvas 2D)**. Ranh giới `src/logic` ↔ `src/render` được giữ rõ ràng:

```
src/
  logic/      ← hàm thuần: physics, collision, scoring (không import DOM)
  render/     ← Canvas 2D calls (nhận state, vẽ, không chứa logic)
  index.ts    ← game loop, kết nối logic ↔ render ↔ input
```

**Điều có thể làm quyết định này sai:**

- Scope mở rộng cần audio engine, particle system, sprite sheet animation → Phaser tiết kiệm thời gian hơn.
- Target mobile low-end cần WebGL để đạt 60 FPS → Phaser's renderer có lợi thế thực sự.
- Team quen Phaser hơn accumulator pattern → chi phí học ngược lại.

### Cách kiểm chứng

- [ ] `npm run check` xanh không có import Canvas/DOM trong `src/logic/`.
- [ ] Test R1–R4 chạy trong Node.js (không cần browser/jsdom).
- [ ] Đo FPS: dùng `requestAnimationFrame` timestamp, assert ≥ 60 FPS trên laptop thường trong 1 phút.
- [ ] Kiểm tra bundle size: `dist/` không có Phaser hoặc game engine nào.

---

## ADR-003 – D3: Tính điểm theo bước physics

**Ngày:** 2026-10-24
**Trạng thái:** Đã chốt

### Bối cảnh

R6 làm tốc độ ống phụ thuộc vào score. Nếu tính điểm một lần mỗi frame, thời điểm đạt ngưỡng tăng tốc có thể phụ thuộc vào framerate, trái với yêu cầu E3.

### Phương án

| Phương án | Cách tính điểm | Tác động |
| --------- | -------------- | -------- |
| A         | Sau mỗi bước physics | Thời điểm thay đổi score và tốc độ ống nhất quán giữa các framerate |
| B         | Một lần mỗi frame | Thời điểm thay đổi score và tốc độ ống có thể phụ thuộc vào framerate |

### Quyết định

**Chọn phương án A:** tính điểm sau mỗi bước physics. Tốc độ ống được xác định từ score ở đầu bước; điểm vừa cộng chỉ ảnh hưởng từ bước physics kế tiếp.

### Cách kiểm chứng

- [ ] Test E8: đưa một frame có nhiều bước physics vào accumulator và so kết quả với việc chạy cùng số bước riêng lẻ; state, score và vị trí ống phải giống nhau.

---

## ADR-004 – Feature flag `difficultyRamp` và rollback

**Ngày:** 2026-10-26
**Trạng thái:** Đã chốt

### Bối cảnh

R6 (ống nhanh hơn 15% sau 10 điểm) là thay đổi gameplay mới. Nếu người chơi thấy quá khó, cần tắt nhanh mà không phải revert code.

### Phương án

| Phương án | Cách làm | Ưu / nhược |
| --------- | -------- | ---------- |
| A | Cờ đọc lúc build từ `VITE_FLAG_DIFFICULTY_RAMP`, truyền vào logic như tham số | Đơn giản, không thêm dependency, người chơi không tự đổi được; đổi cờ phải build và deploy lại |
| B | Cờ đọc từ query string (`?ramp=off`) | Đổi tức thì, không cần deploy; người chơi tự đổi được, khó đảm bảo cả hai nhánh được kiểm tra |
| C | Logic tự đọc biến toàn cục `FLAGS` | Ít sửa chữ ký hàm; làm logic không còn thuần, test phụ thuộc môi trường |

### Quyết định

**Chọn phương án A.** Cờ nằm ở `src/flags.ts` (ngoài `src/logic`). `src/main.ts` đọc cờ và truyền vào `update` / `currentPipeSpeed` qua tham số `difficultyRamp` (mặc định `true`). Chỉ giá trị `"false"` mới tắt cờ; không đặt, rỗng hoặc `"true"` đều bật.

### Rollback

Có hai cách; chọn cách nhanh nhất cho tình huống:

1. **Tắt cờ:** đặt `VITE_FLAG_DIFFICULTY_RAMP=false` trong môi trường build (CI hoặc `.env.production`), build và deploy lại. Ống giữ 160 px/s ở mọi điểm số (E11); code R6 vẫn còn.
2. **Revert PR:** `git revert` PR đã thêm tính năng, để CI chạy rồi deploy lại. Dùng khi lỗi nằm ở chính code của R6.

Bật lại: bỏ biến hoặc đặt `true`, build và deploy lại.

### Cách kiểm chứng

- [ ] Test E11 (`tests/difficulty-flag.test.ts`): cờ tắt thì ống luôn 160/60 px mỗi bước; cờ bật hoặc không truyền thì như R6.
- [ ] Diễn tập: build với `VITE_FLAG_DIFFICULTY_RAMP=false`, chơi qua 10 điểm và xác nhận ống không tăng tốc; build lại không đặt biến, xác nhận ống tăng tốc sau điểm thứ 10.
- [ ] Log `death` có trường `difficultyRamp` để phân biệt dữ liệu của hai chế độ.
