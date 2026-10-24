# Test Matrix – Flappy Bird

> Đối chiếu với test hiện có trong `tests/logic.test.ts`, `tests/input.test.ts` và `tests/invariants.test.ts`.
> Đây là danh mục kiểm thử và ghi chú phạm vi; trạng thái pass/fail phải lấy từ lần chạy `npm run check` gần nhất.

## 1. `createRng(seed)` — `tests/logic.test.ts`

| ID  | Trường hợp           | Mong đợi                      | Test |
| --- | -------------------- | ----------------------------- | ---- |
| C1  | Seed 42; gọi 3 lần   | Hàm trả số trong `[0, 1)`     | Có   |
| C2  | Hai RNG cùng seed 42 | Hai chuỗi 5 số giống nhau     | Có   |
| C3  | Seed 0               | Không throw; số trả về hợp lệ | Có   |
| C4  | Seed `0xffffffff`    | Không throw; số trả về hợp lệ | Có   |
| C5  | Seed 42 và 43        | Hai chuỗi 5 số khác nhau      | Có   |

## 2. `initialState(seed)` — `tests/logic.test.ts`

| ID  | Trường hợp              | Mong đợi                                        | Test |
| --- | ----------------------- | ----------------------------------------------- | ---- |
| I1  | State ban đầu           | `ready`, score/t/accumulator bằng 0             | Có   |
| I2  | Bird ban đầu            | `y = 280`, `vy = 0`                             | Có   |
| I3  | Pipes ban đầu           | Mảng rỗng                                       | Có   |
| I4  | Gọi hai lần với seed 42 | Các trường state và số RNG tiếp theo giống nhau | Có   |
| I5  | RNG trong state         | Là hàm trả số trong `[0, 1)`                    | Có   |

## 3. `update` — R1: physics và status — `tests/logic.test.ts`

| ID  | Trường hợp                  | Mong đợi                                 | Test |
| --- | --------------------------- | ---------------------------------------- | ---- |
| P1  | `y=300`, `vy=0`, dt=`1/60`  | `vy=30`, `y=300.5` (semi-implicit Euler) | Có   |
| P2  | `y=300`, `vy=30`, dt=`1/60` | `vy=60`, `y=301`                         | Có   |
| P3  | dt=0                        | Không chạy bước physics; y/vy không đổi  | Có   |
| P4  | dt=`1/60`                   | Chạy đúng một bước; accumulator bằng 0   | Có   |
| P5  | dt=0.05                     | Chạy 3 bước; accumulator gần 0           | Có   |
| P6  | dt=1.0                      | Clamp về tối đa 0.05; tối đa 3 bước      | Có   |
| P7  | dt=0.049                    | Chạy 2 bước; giữ phần dt dư              | Có   |
| P8  | Status `ready`              | Physics và thời gian không tiến          | Có   |
| P9  | Status `over`               | State không đổi theo update              | Có   |
| P10 | `over`, input/dt bất kỳ     | Kết quả deep-equal state đầu vào         | Có   |

## 4. `update` — R2: flap — `tests/logic.test.ts`

| ID  | Trường hợp                    | Mong đợi                          | Test                                |
| --- | ----------------------------- | --------------------------------- | ----------------------------------- |
| F1  | Đang chơi, `vy=100`, flap     | `vy` được đặt thành -420          | Có                                  |
| F2  | Đang chơi, `vy=-420`, flap    | `vy=-420`                         | Có                                  |
| F3  | Đang chơi, `vy=-999`, flap    | Ghi đè thành -420, không cộng dồn | Có                                  |
| F4  | `ready`, flap                 | Không áp dụng vận tốc flap        | Có                                  |
| F5  | `over`, flap                  | Không áp dụng vận tốc flap        | Có                                  |
| F6  | Logic nhận `flap=true` đã gộp | Xử lý một flap                    | Có; kiểm tra caller riêng ở nhóm E4 |

## 5. `update` — R3: collision — `tests/logic.test.ts`

| ID  | Trường hợp                 | Mong đợi                                      | Test |
| --- | -------------------------- | --------------------------------------------- | ---- |
| D1  | Chạm/vượt trần             | `over`, y kẹp về 12                           | Có   |
| D2  | Nằm trong ngưỡng trần      | Tiếp tục `playing`                            | Có   |
| D3  | Chạm/vượt đất              | `over`, y kẹp về 588                          | Có   |
| D4  | Nằm trong ngưỡng đất       | Tiếp tục `playing`                            | Có   |
| D5  | Va chạm ống trên           | `over`                                        | Có   |
| D6  | Va chạm ống dưới           | `over`                                        | Có   |
| D7  | Chim nằm trong khe an toàn | Tiếp tục `playing`                            | Có   |
| D8  | Bird rơi nhanh, dt=0.05    | Va chạm đất được phát hiện trong các bước nhỏ | Có   |
| D9  | Flap gần trần              | Va chạm trần được phát hiện và y kẹp về 12    | Có   |

## 6. `update` — R4: scoring — `tests/logic.test.ts`

| ID  | Trường hợp                                   | Mong đợi                       | Test |
| --- | -------------------------------------------- | ------------------------------ | ---- |
| S1  | Cạnh phải ống đi qua x=80 trong bước physics | Tăng 1 điểm, đánh dấu `scored` | Có   |
| S2  | Pipe đã `scored`                             | Không cộng lại                 | Có   |
| S3  | Cạnh phải còn trước x=80                     | Không cộng điểm                | Có   |
| S4  | Cạnh phải đúng bằng x=80                     | Chưa cộng điểm (chưa vượt qua) | Có   |
| S4b | Cạnh phải nhỏ hơn x=80                       | Cộng điểm một lần              | Có   |
| S5  | Nhiều pipe đã qua bird                       | Mỗi pipe được tính một lần     | Có   |
| S6  | Nhiều lần update                             | Score không giảm               | Có   |

## 7. Pipe lifecycle — `tests/logic.test.ts`

| ID  | Trường hợp                            | Mong đợi                                                       | Test |
| --- | ------------------------------------- | -------------------------------------------------------------- | ---- |
| PL1 | Chơi, chưa có pipe                    | Pipe đầu được tạo tại x=400 rồi dịch chuyển theo bước hiện tại | Có   |
| PL2 | Pipe cuối ở x=180                     | Tạo pipe mới tại x=400 rồi dịch chuyển theo bước hiện tại      | Có   |
| PL3 | Pipe đã thoát bên trái (`x + 52 < 0`) | Bị loại khỏi mảng                                              | Có   |
| PL4 | Pipes được spawn                      | `gapY` thuộc `[80, 520]`                                       | Có   |
| PL5 | Status `over`                         | Không spawn hoặc di chuyển pipe                                | Có   |

## 8. Determinism và E-series — `tests/logic.test.ts`

| ID            | Trường hợp                      | Mong đợi                                                  | Test |
| ------------- | ------------------------------- | --------------------------------------------------------- | ---- |
| DET1 / E3     | Mô phỏng 3 giây ở 60Hz và 144Hz | Bird y và score tương đương                               | Có   |
| DET2 / E5     | Cùng seed và chuỗi input        | State mô phỏng cuối giống nhau                            | Có   |
| DET3 / E2, E5 | dt=1.0 so với 60 bước thường    | Kết quả khác nhau do clamp; ghi nhận ngoại lệ determinism | Có   |

## 9. Input layer — E4 — `tests/input.test.ts`

| ID   | Trường hợp                                | Mong đợi                                                   | Test |
| ---- | ----------------------------------------- | ---------------------------------------------------------- | ---- |
| E4.1 | Space, pointer và touch trước lần consume | Chỉ một cờ flap được tiêu thụ; consume tiếp theo trả false | Có   |
| E4.2 | Phím khác Space                           | Không kích hoạt flap, không gọi `preventDefault`           | Có   |

## 10. Invariants — `tests/invariants.test.ts`

| ID   | Trường hợp                        | Mong đợi                                             | Test               |
| ---- | --------------------------------- | ---------------------------------------------------- | ------------------ |
| INV1 | Chuỗi frame/input sinh ngẫu nhiên | Score không giảm; state mới reset score về 0         | Có, property-based |
| INV2 | Chuỗi frame/input sinh ngẫu nhiên | Mọi `gapY` nằm trong `[80, 520]`                     | Có, property-based |
| INV3 | Chuỗi frame/input sinh ngẫu nhiên | Không giữ pipe đã thoát hoàn toàn khỏi trái màn hình | Có, property-based |

## 11. Architecture boundary — R5 — `tests/logic.test.ts`

| ID  | Trường hợp                           | Mong đợi                                                      | Test     |
| --- | ------------------------------------ | ------------------------------------------------------------- | -------- |
| A1  | Import logic trong Node.js không DOM | Các hàm public import được                                    | Có       |
| A2  | Quét `src/logic/index.ts`            | Không có tham chiếu DOM/Canvas/window                         | Có       |
| A3  | Quét import trong logic              | Không import từ `src/render`                                  | Có       |
| A4  | Update state thuần                   | Trả state mới, không sửa bird trong input state               | Có       |
| A4b | Hai update từ cùng state và RNG      | Gap pipe và RNG tiếp theo giống nhau; input RNG không bị tiến | Có       |
| A5  | Logic game không nằm trong render    | Review thủ công; hiện không có test tự động                   | Thủ công |

## 12. Tổng quan và khoảng trống

- Có 55 test case trong `tests/logic.test.ts`, 2 test trong `tests/input.test.ts`, và 3 property-based test trong `tests/invariants.test.ts` (tổng 60 test case).
- E1–E5 có test tương ứng; E6 được bao phủ bởi D3; E7 được bao phủ bởi D8.
- Các nhóm trên không bao gồm đo FPS một phút, kiểm tra game chạy liên tục một phút, kiểm thử trực quan trên browser, hoặc benchmark hiệu năng.
- A5 là review thủ công, không phải test tự động.
- `npm run check` mới là nơi xác nhận kết quả thực thi; tài liệu này không ghi trước trạng thái pass/fail.
