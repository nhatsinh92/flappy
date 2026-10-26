# Checklist review code do AI sinh

PR/nhánh: ______  Người review: ______  Ngày: ______

Chi tiết các tầng và yêu cầu: xem `docs/review-policy.md`.

## 0. Nhận diện tầng PR (làm đầu tiên)

Lấy danh sách file đổi: `git diff --name-only origin/main...HEAD`

- [ ] Có file thuộc **tầng 3** không? (`SPEC*.md`, `AGENTS.md`, `CLAUDE.md`, `docs/decisions.md`, `docs/review-*.md`, `.github/**`, `package*.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `src/config/**`, `.env*`, cấu hình deploy)
- [ ] Nếu không: có đổi `src/logic/**`, `src/main.ts`, hoặc **sửa/xóa** test có sẵn không? → **tầng 2**
- [ ] Nếu không: chỉ `src/render/**` thuần giao diện, thêm test mới không đổi hành vi, hoặc tài liệu khác → **tầng 1**
- [ ] PR có trộn nhiều tầng hoặc bạn không chắc? → chọn **tầng cao hơn**

**Tầng của PR này: ____ (1 / 2 / 3)**

Dùng cột "Tầng" dưới đây để biết mục nào bắt buộc: 1 = tầng 1 trở lên (mọi PR), 2 = từ tầng 2, 3 = chỉ tầng 3.

## 1. Khớp spec  (Tầng 2+)
- [ ] Mỗi luật R1–R6 trong SPEC.md có đoạn code tương ứng (ghi file:dòng).
- [ ] Không có hành vi nào trong code mà spec không nhắc (tính năng thừa).

## 2. Đường lỗi và edge case  (Tầng 2+)
- [ ] Mỗi edge case E1–E10 có xử lý trong code và có test (ghi tên test).
- [ ] Input bất thường (dt = 0, dt rất lớn, state đã 'over') không làm game hỏng.

## 3. Dependency  (Tầng 1+)
- [ ] `package.json` không có package mới ngoài danh sách đã duyệt.
- [ ] Mọi import đều trỏ tới package/file có thật.

## 4. Độ gọn của code  (Tầng 1+)
- [ ] Không có lớp trừu tượng chỉ dùng một lần, không có code lặp.
- [ ] Comment giải thích được "vì sao", không chỉ nhắc lại dòng code.

## 5. Bảo mật và dữ liệu vào  (Tầng 2+)
- [ ] Dữ liệu đọc từ localStorage (nếu có) được kiểm tra trước khi dùng.
- [ ] Không có secret, URL ngoài hoặc gọi mạng.

## 6. Chất lượng test  (Tầng 2+)
- [ ] Có test cho đường lỗi, không chỉ happy path.
- [ ] Đổi thử một hằng số hoặc dấu so sánh thì ít nhất một test chuyển đỏ.
- [ ] Test có sẵn bị sửa/xóa: đã đọc giá trị kỳ vọng mới và công thức tính từ spec (không lấy từ output của code).

## 7. Bổ sung theo tầng

**Tầng 1**
- [ ] CI xanh, đã đọc bản tóm tắt của agent review, đã liếc diff.

**Tầng 2** (thêm vào tầng 1)
- [ ] Đã đọc spec diff (nếu spec đổi) và test diff kỹ.
- [ ] Lấy mẫu ít nhất 3 đoạn code, tự giải thích được "vì sao AI chọn cách này".
- [ ] Đã thử phá ít nhất 1 lần (mutation thủ công).
- [ ] Đã lấy mẫu ít nhất 3 mục agent báo "đạt" để xác minh.
- [ ] Đã chơi thử trên trình duyệt nếu ảnh hưởng gameplay.

**Tầng 3** (thêm vào tầng 2)
- [ ] Đã đọc từng dòng diff; agent chỉ hỗ trợ.
- [ ] Spec đổi: có commit spec riêng, test đỏ trước, code xanh sau.
- [ ] Dependency đổi: package có thật, có lý do, đã cân nhắc phương án không cần thêm.
- [ ] Workflow CI đổi: `permissions` tối thiểu, không lộ secret.
- [ ] Flag chỉ đọc ở `src/config/flags.ts`, truyền xuống qua tham số, không rải `if` trong logic.
- [ ] Mô tả PR có kế hoạch rollback (tắt flag hoặc revert).

## Kết luận
Điểm lệch spec / test yếu / chi tiết thừa đã tìm thấy: ______

Thời gian review: ______  Số mục không đạt: ______

Sau merge, chép một dòng vào `docs/review-log.md` (ngày, PR, tầng, thời gian, số mục không đạt, lỗi lọt nếu có).