# Flappy Bird – SPEC v0.1

## 1. Mục tiêu / Non-goals
- Mục tiêu: game 1 nút bấm, chạy trên web, chơi được bằng chuột/phím cách/chạm.
- Non-goals: không có multiplayer, không có tài khoản, không gọi mạng.

## 2. Đơn vị và hệ tọa độ
- px, giây; y hướng xuống; màn hình logic 400x600.

## 3. State (TypeScript)
- bird: { y, vy }, pipes: { x, gapY }[], score, status: 'ready'|'playing'|'over'

## 4. Tham số (giá trị khởi điểm)
| Tên | Giá trị |
|---|---|
| gravity | 1800 px/s² |
| flapVelocity | -420 px/s |
| pipeGap | 160 px |
| pipeSpeed | 160 px/s |
| pipeSpacing | 220 px |
| birdRadius | 12 px |

## 5. Luật
- R1: mỗi frame vy += gravity*dt; y += vy*dt.
- R2: input flap đặt vy = flapVelocity.
- R3: chạm ống, đất, hoặc trần => status = 'over'.
- R4: qua mỗi ống +1 điểm, đúng 1 lần cho mỗi ống.

## 6. Ví dụ vào/ra
- Trước: bird {y:300, vy:0}, dt=0.016, không input. Sau: vy≈28.8, y≈300.46.

## 7. Edge case (kịch bản)
- E1: bird chạm trần => over, không cho bay xuyên.
- E2: tab bị ẩn rồi quay lại => dt bị kẹp ≤ 0.05s, không dịch chuyển tức thời.
- E3: màn hình 144Hz và 60Hz cho kết quả vật lý tương đương.
- E4: bấm nhiều lần trong cùng một frame = 1 flap.
- E5: cùng seed và cùng chuỗi input => cùng kết quả.

## 8. Negative examples (KHÔNG được)
- Điểm âm; cộng điểm hai lần cho một ống; gọi mạng; đọc/ghi DOM trong src/logic.

## 9. Invariants
- score không bao giờ giảm; khoảng hở ống luôn nằm hoàn toàn trong màn hình.

## 10. Observability
- Khi thua, ghi log: { type:'death', cause, score, t }.

## 11. Test strategy
- Unit cho từng luật R1–R4, test cho E1–E5, property-based cho invariants.

## 12. Tiêu chí chấp nhận
- npm run check xanh; chơi 1 phút không lỗi; 60 FPS trên laptop thường.