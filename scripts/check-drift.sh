#!/usr/bin/env bash
# Guardrail chống lệch spec/test trong PR (AGENTS.md: "Không sửa test để cho test xanh").
#   1. FAIL  nếu PR xóa hoặc sửa dòng trong tests/ (chỉ thêm test mới thì được),
#            trừ khi PR có nhãn `test-change-approved` (APPROVED=true).
#   2. WARN  nếu PR đổi src/logic/ mà không đổi SPEC.md.
# Biến môi trường: BASE_SHA (commit gốc của PR), APPROVED (true/false).
set -euo pipefail

base="${BASE_SHA:?BASE_SHA is required}"
approved="${APPROVED:-false}"
status=0

removed_in_tests=$(git diff --numstat "$base"...HEAD -- tests/ \
  | awk '$2 != "-" && $2 > 0 { print $2 "\t" $3 }')

if [ -n "$removed_in_tests" ]; then
  echo "Dòng bị xóa/sửa trong test có sẵn (xóa<TAB>file):"
  echo "$removed_in_tests"
  if [ "$approved" = "true" ]; then
    echo "::notice::Thay đổi test có sẵn đã được duyệt bằng nhãn test-change-approved."
  else
    echo "::error::PR sửa hoặc xóa test có sẵn. Nếu test sai, báo lại và gắn nhãn test-change-approved sau khi người duyệt xác nhận."
    status=1
  fi
fi

logic_changed=$(git diff --name-only "$base"...HEAD -- src/logic/)
spec_changed=$(git diff --name-only "$base"...HEAD -- SPEC.md)

if [ -n "$logic_changed" ] && [ -z "$spec_changed" ]; then
  echo "::warning::src/logic đổi nhưng SPEC.md không đổi. Kiểm tra: spec còn đúng không, hay đây là refactor thuần?"
fi

exit "$status"
