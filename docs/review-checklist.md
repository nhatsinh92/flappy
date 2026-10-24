# Checklist review code do AI sinh

PR/nhánh: ______  Người review: ______  Ngày: ______

## 1. Khớp spec
- [ ] Mỗi luật R1–R6 trong SPEC.md có đoạn code tương ứng (ghi file:dòng).
- [ ] Không có hành vi nào trong code mà spec không nhắc (tính năng thừa).

## 2. Đường lỗi và edge case
- [ ] Mỗi edge case E1–E5 có xử lý trong code và có test (ghi tên test).
- [ ] Input bất thường (dt = 0, dt rất lớn, state đã 'over') không làm game hỏng.

## 3. Dependency
- [ ] `package.json` không có package mới ngoài danh sách đã duyệt.
- [ ] Mọi import đều trỏ tới package/file có thật.

## 4. Độ gọn của code
- [ ] Không có lớp trừu tượng chỉ dùng một lần, không có code lặp.
- [ ] Comment giải thích được "vì sao", không chỉ nhắc lại dòng code.

## 5. Bảo mật và dữ liệu vào
- [ ] Dữ liệu đọc từ localStorage (nếu có) được kiểm tra trước khi dùng.
- [ ] Không có secret, URL ngoài hoặc gọi mạng.

## 6. Chất lượng test
- [ ] Có test cho đường lỗi, không chỉ happy path.
- [ ] Đổi thử một hằng số hoặc dấu so sánh thì ít nhất một test chuyển đỏ.

## Kết luận
Điểm lệch spec / test yếu / chi tiết thừa đã tìm thấy: ______