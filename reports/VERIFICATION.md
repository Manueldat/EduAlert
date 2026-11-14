# Kết quả kiểm chứng bản source EduAlert v1

Ngày kiểm tra: 08/11/2026. Môi trường thực thi: Linux x64, Node 24.22.1, npm 11.9.0, Python 3.12.14, Prisma 6.19.3, scikit-learn 1.8.0. Database đã thực thi là SQLite. Lệnh Windows trong README được chuyển tương ứng cho PowerShell, chưa chạy trên một máy Windows thật trong phiên kiểm tra này.

## Những gì đã chạy thành công

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| Cài mới dependency từ lockfile | PASS: npm ci trong thư mục độc lập, 322 package | Lockfile không cần npm install để sửa |
| Prisma SQLite generate + db push | PASS | Schema dùng để chạy test và demo tích hợp |
| Node test runner | PASS, 15/15 theo bộ đếm của runner | node-tests.log; gồm 7 unit, 7 ca tích hợp và 1 test bao ngoài |
| Python unittest | PASS, 2/2 | python-tests.log |
| Frontend production build | PASS | frontend-build.log |
| API + database + FastAPI + model thật | PASS | smoke.json, e2e-tests.log |
| Phục vụ HTML đã build qua Express | PASS | e2e-tests.log; không thay cho kiểm thử trình duyệt |
| Prisma SQL Server schema | PASS validation, đã sinh DDL | backend/prisma/sqlserver.prisma và sqlserver-init.sql |
| npm audit trên dependency đã khóa | 0 advisory tại lúc kiểm tra | npm-audit.json; không phải chứng nhận không có lỗi bảo mật |

Test Node kiểm tra tính điểm/học lại, thiếu dữ liệu, bảo lưu, ngưỡng, quyền theo lớp, dữ liệu sai, cảnh báo không trùng, lưu ghi chú, Socket.io gửi đúng CVHT, đăng xuất, ML lỗi và phục hồi. Test tích hợp Node dùng ML mock có chủ đích để kiểm soát trạng thái.

Smoke gọi mô hình thật qua FastAPI, đối chiếu kết quả backend với gọi /predict trực tiếp (sai số dưới 1e-12), kiểm tra lưu trữ, chống trùng và ghi chú. Snapshot cuối cùng ghi modelVersion `synthetic-v1-50df1c72-randomforest`. Probability của hồ sơ kiểm thử là 0.5839427141822959; đây là dữ liệu test, không phải độ chính xác mô hình.

## Những gì chưa được xác nhận

- SQL Server engine và Docker Compose chưa chạy: môi trường không có hai runtime này. Validation schema/DDL không chứng minh engine đã hoạt động.
- Kiểm thử trình duyệt Playwright chưa hoàn tất. Chromium bị chặn tại khởi động với lỗi `socket() failed: Operation not permitted`, trước khi tải website. Vì vậy không ghi nhận PASS cho giao diện hoặc responsive. Script `scripts/test-ui.py` được cung cấp để nhóm chạy tiếp trên máy cá nhân; kiểm tra thủ công theo docs/05_KIEM_THU_DEMO.md.
- Chưa triển khai máy chủ công khai, chưa chạy workflow trên GitHub, chưa đo tải nhiều người dùng. Cấu hình triển khai/CI là mã được chuẩn bị sẵn.
- Chưa có dữ liệu thật hoặc quy chế chính thức của trường; chưa kiểm định dự báo trên sinh viên thật.

## Kết quả ML trên tập test giả lập

Mô hình được chọn: RandomForest, sau khi so sánh với LogisticRegression. Có DummyClassifier baseline. Hiệu chỉnh sigmoid dùng tập riêng. Tập test gồm 560 mẫu của 280 sinh viên giả lập chưa xuất hiện trong train; tỷ lệ nhãn dương 23.93%. Tỷ lệ này do mô phỏng sinh ra, không suy rộng thành tỷ lệ cảnh báo của trường.

| Chỉ số | Giá trị |
|---|---:|
| Average precision | 0.8425 |
| ROC-AUC | 0.9078 |
| Brier score | 0.0871 |
| Precision tại ngưỡng Đỏ 0.33 | 0.7462 |
| Recall tại ngưỡng Đỏ 0.33 | 0.7239 |
| F1 tại ngưỡng Đỏ 0.33 | 0.7348 |
| Recall tại ngưỡng Vàng 0.21 | 0.8060 |
| TN / FP / FN / TP tại ngưỡng Đỏ | 393 / 33 / 37 / 97 |

Ngưỡng Vàng đạt mục tiêu recall >=0.85 trên tập chọn ngưỡng, không đảm bảo recall >=0.85 trên test. Kết quả test thực tế được giữ nguyên, không đổi ngưỡng để làm đẹp chỉ số.

## Phạm vi bản bàn giao

Source frontend/backend/ML, mô hình và dữ liệu giả lập, schema/DDL, seed, kiểm thử, Docker/CI, README Windows, 12 bước triển khai và nội dung báo cáo/thuyết trình. Báo cáo và dàn ý slide ở dạng Markdown để nhóm biên tập theo mẫu nộp; chưa phải file DOCX/PPTX đã định dạng.

Không chứa .env, khóa riêng, session, database đang chạy hoặc node_modules. Setup tạo khóa mới trên máy nhóm. Các tài khoản trong README là tài khoản demo do seed tạo.
