# Chính sách review PR (v0.1)

Mục tiêu: giữ chất lượng khi code do AI sinh ra nhiều hơn mức người đọc hết được. Nguyên tắc: **mức review tỷ lệ với rủi ro của thay đổi**, và **người luôn là người quyết định merge**.

## 1. Nguyên tắc

1. Tác giả PR chịu trách nhiệm về mọi dòng trong PR, kể cả dòng do agent sinh ra.
2. Agent chỉ review và đề xuất. Agent không approve, không merge, không sửa `SPEC.md`, `AGENTS.md` hay chính file này.
3. Spec và test là hợp đồng. Review spec và test trước, code sau.
4. Một PR một mục đích. PR trộn nhiều tầng thì tính theo tầng cao nhất.
5. Không chắc PR thuộc tầng nào thì chọn tầng cao hơn.

## 2. Xác định tầng của PR

Lấy tầng cao nhất trong số các file bị đổi. Danh sách file lấy bằng:

```
git diff --name-only origin/main...HEAD
```

| Tầng | Điều kiện (theo file và loại thay đổi) |
|---|---|
| **3 – Cao** | `SPEC.md`, `SPEC-*.md`, `AGENTS.md`, `CLAUDE.md`, `docs/decisions.md`, `docs/review-policy.md`, `docs/review-checklist.md`; `.github/**`; `package.json`, `package-lock.json`; `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`; `src/config/**` (feature flag); `.env*`; mọi thay đổi cấu hình deploy |
| **2 – Trung bình** | `src/logic/**`; `src/main.ts`; **sửa hoặc xóa** test có sẵn trong `tests/**` (đổi giá trị kỳ vọng, nới sai số, bỏ test) |
| **1 – Thấp** | `src/render/**` thuần giao diện; **thêm** test mới mà không đổi hành vi; tài liệu khác (`README`, `docs/test-matrix.md`, comment) |

Quy tắc đi kèm:
- Sửa hoặc xóa test có sẵn luôn ít nhất là tầng 2, vì đó là cách dễ nhất để code sai vẫn qua CI.
- Đổi `src/render/**` mà đụng tới logic hoặc input thì lên tầng 2.
- Không chia nhỏ PR để né tầng cao. Nếu hai PR liên quan chặt chẽ, người review được quyền gộp tầng.

Kiểm tra nhanh bằng PowerShell (khớp tầng 3 thì in ra dòng tương ứng):

```powershell
git diff --name-only origin/main...HEAD | Select-String -Pattern '^(SPEC|AGENTS|CLAUDE)','^docs/(decisions|review-policy|review-checklist)','^\.github/','^package(-lock)?\.json$','^(vite\.config|tsconfig|eslint\.config)','^src/config/','^\.env'
```

## 3. Yêu cầu theo tầng

| | Tầng 1 | Tầng 2 | Tầng 3 |
|---|---|---|---|
| CI (`npm run check`) xanh | Bắt buộc | Bắt buộc | Bắt buộc |
| Agent review (phiên mới, chỉ đọc) | Có | Có, theo checklist đầy đủ | Có, chỉ để hỗ trợ |
| Người đọc spec diff | Không | Có (nếu spec đổi) | Có |
| Người đọc test diff | Liếc | Đọc kỹ giá trị kỳ vọng | Đọc kỹ |
| Người đọc code diff | Liếc | Lấy mẫu ít nhất 3 đoạn, mỗi đoạn tự giải thích "vì sao" | Đọc từng dòng |
| Thử phá (mutation thủ công) | Không | Ít nhất 1 lần | Ít nhất 1 lần nếu có đổi logic |
| Chơi thử trên trình duyệt | Không | Có, nếu ảnh hưởng gameplay | Có, nếu ảnh hưởng gameplay |
| Kế hoạch rollback ghi trong PR | Không | Nếu đổi hành vi | Bắt buộc |

Bổ sung riêng cho tầng 3:
- Spec đổi: làm theo quy trình spec diff (spec → test đỏ → code xanh), có commit spec riêng.
- Dependency đổi: kiểm tra package có thật, vì sao cần, và có giải pháp không cần thêm không.
- Workflow CI đổi: quyền (`permissions`) ở mức tối thiểu, không lộ secret.
- Flag đổi: flag chỉ được đọc ở `src/config/flags.ts` và truyền xuống qua tham số.

## 4. Quy trình agent review

1. Mở **phiên mới**, không dùng lại phiên đã sinh code (phiên cũ có xu hướng bênh code của chính nó).
2. Đưa vào: `SPEC.md`, `AGENTS.md`, `docs/review-checklist.md` và diff của nhánh so với `main`.
3. Yêu cầu: không sửa file nào; trả về bảng "mục | đạt/không đạt | bằng chứng (file:dòng) | mức chắc chắn"; tối đa 5 rủi ro lớn nhất; ghi "không rõ" thay vì đoán.
4. Người xác minh: kiểm tra mọi mục "không đạt" và **lấy mẫu ít nhất 3 mục "đạt"** để chắc agent không gật bừa.

## 5. Kích thước và nhịp PR

- Mỗi PR một mục đích. Gợi ý: diff khoảng 400 dòng trở xuống (không tính lockfile). Vượt quá thì tách.
- Thứ tự commit trong nhánh thay đổi hành vi: spec → test (đỏ) → code (xanh).
- PR do agent sinh phải nêu trong mô tả: tầng, file đổi, giả định agent đã đưa ra.

## 6. Khi review phát hiện lỗi

Phân loại nguyên nhân (báo nhầm, spec mơ hồ, test yếu, code sai) rồi sửa theo thứ tự spec → test → code. Lỗi lặp lại ở một kiểu thì thêm luật vào `AGENTS.md` hoặc guardrail vào CI (lint, kiểm tra kiến trúc), để lần sau không cần mắt người bắt.

## 7. Đo lường và điều chỉnh

Sau mỗi PR, ghi một dòng vào `docs/review-log.md`:

| Ngày | PR | Tầng | Thời gian review | Số mục checklist không đạt | Lỗi lọt sau merge |
|---|---|---|---|---|---|

Cứ khoảng 10 PR xét lại một lần:
- Có lỗi lọt từ tầng 1 hoặc 2 thì nâng tầng cho loại file đó, hoặc thêm guardrail tự động.
- Nhiều PR tầng 2 sạch liên tục thì có thể nới (ví dụ giảm số đoạn code lấy mẫu), nhưng chỉ khi số liệu ủng hộ.
- Việc đổi chính sách này là thay đổi tầng 3.

## 8. Trường hợp khẩn cấp

Sự cố trên bản đã deploy: rollback trước (tắt flag `difficultyRamp` hoặc revert PR, rồi deploy lại), sau đó sửa nguyên nhân qua quy trình bình thường. Rollback không cần review đầy đủ, nhưng bản sửa thật thì vẫn phải qua đúng tầng của nó.

## 9. Mẫu PR template (tùy chọn)

Có thể chép vào `.github/pull_request_template.md` (file này thuộc tầng 3):

```markdown
## Tầng PR
- [ ] Tầng 1  - [ ] Tầng 2  - [ ] Tầng 3
Lý do chọn tầng (liệt kê file đổi chính): 

## Mô tả
Thay đổi gì và vì sao. Spec/test/code liên quan:

## Do agent sinh?
- [ ] Có (giả định của agent: ...)  - [ ] Không

## Rollback
Cách hoàn tác (flag / revert):

## Checklist
- [ ] `npm run check` xanh
- [ ] Đã điền `docs/review-checklist.md` theo tầng
```