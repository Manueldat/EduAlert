# Kiểm thử và kịch bản demo

## Kiểm thử tự động

| Lệnh | Mục tiêu |
|---|---|
| npm test | Unit nghiệp vụ + integration HTTP/Socket/Prisma trên SQLite riêng |
| python -m unittest ml.test_ml -v | Chia dữ liệu, schema, key, dự báo API bằng model artifact |
| npm run build | Biên dịch React, Tailwind và Recharts |
| python scripts/e2e-local.py | Tự mở API cổng 3300 + ML 8300, smoke với mô hình thật rồi đóng |
| node scripts/smoke.mjs | Tương tự trên API/ML đang chạy ở cổng mặc định |

e2e-local cần đã db:prepare, seed, train và build. Dùng Python trong .venv trên Windows. Nó thêm một sinh viên test có mã TEST..., không xóa dữ liệu demo cũ. Test Node tự dùng SQLite riêng và không tác động database của bạn. Nên tắt dev server trước npm test vì Prisma Client được tạo lại trong lúc test.

## Ma trận kiểm thử thủ công

| TC | Thực hiện | Kết quả mong đợi |
|---|---|---|
| 01 | Đăng nhập đúng/sai mật khẩu | Thành công hoặc lỗi chung, không lộ hash |
| 02 | CVHT B mở /students/s1 | Không được xem sinh viên lớp A |
| 03 | CVHT gọi API tạo tài khoản | HTTP 403 |
| 04 | Tạo sinh viên trùng MSSV | HTTP 409, không tạo bản ghi thứ hai |
| 05 | Nhập điểm -1 hoặc 5 | Form/API từ chối |
| 06 | Chốt học kỳ còn score=null | HTTP 400 |
| 07 | Thêm một học phần hai lần trong kỳ | API từ chối |
| 08 | HK1 môn A=0, HK2 môn A=3 | TC đạt tính một lần, nợ A biến mất |
| 09 | HK3 học cải thiện A=2 | CPA vẫn lấy điểm cao nhất 3 theo quy tắc demo |
| 10 | GPA giảm đúng 0.5 | Có dấu hiệu DROP |
| 11 | Tỷ lệ tín chỉ trượt đúng 0.5 | Không kích hoạt điều kiện “vượt 50%”; 0.51 có |
| 12 | Chỉ có HK2 mà thiếu HK1 | Chưa đủ dữ liệu, không mặc định Xanh |
| 13 | Cuối HK1 đầy đủ | Chạy ML với gpa_drop=null |
| 14 | Kỳ bảo lưu | Không coi GPA=0, không so sánh điểm qua kỳ ngắt |
| 15 | Đánh giá liên tiếp cùng revision + model + trạng thái | Assessment được dùng lại, Alert không tăng số lượng |
| 16 | Lưu điểm sau khi đã đánh giá | Revision tăng, có snapshot mới, lưu audit |
| 17 | ML tắt | Rule-based còn chạy, ML UNAVAILABLE và probability=null |
| 18 | ML hoạt động trở lại | Đánh giá lại trả kết quả thật, version model rõ ràng |
| 19 | Admin sửa lớp A, CVHT A/B đang mở | A nhận thông báo; B không nhận sự kiện lớp A |
| 20 | Đăng xuất | Cookie/session mất hiệu lực, socket bị ngắt |
| 21 | Tư vấn và chọn RESOLVED | Lưu note nhưng không tự đổi nguy cơ/active |
| 22 | Reload trang | Điểm, dự báo, cảnh báo và note còn lưu |
| 23 | Chuyển lớp sang CVHT B | Quyền API theo phân công mới; thông báo mới gửi B |
| 24 | ML key sai hoặc feature ngoài phạm vi | ML API trả 401 hoặc 422 |

## Kịch bản trình diễn 6–8 phút

1. Đăng nhập admin, giải thích banner giả lập và số sinh viên. Không gọi dữ liệu demo là sinh viên thật.
2. Mở DEMO001, chỉ ra điểm, môn nợ, tiến độ tín chỉ, trạng thái quy tắc hiện tại và dự báo kỳ tới. Giải thích hai kết quả có thể khác nhau.
3. Mở ẩn danh, đăng nhập cvht.a. Trên admin sửa một số điểm HK2 rồi lưu. Quan sát realtime ở cửa sổ cố vấn.
4. Từ hồ sơ, đọc môn cần trả nợ và ghi chú tư vấn. Chọn Đang hỗ trợ; reload để thấy dữ liệu được lưu.
5. Mở trang mô hình, nói rõ cách chia tập, dữ liệu giả lập, metrics và giới hạn.
6. Tắt ML, chạy Đánh giá lại để chứng minh chương trình xử lý lỗi. Bật ML lại và đánh giá phục hồi.
7. Mở báo cáo test để chỉ ra kiểm tra quyền, dữ liệu thiếu, học lại, chống trùng.

Trước buổi demo chạy một lần toàn bộ kịch bản, giữ cổng trống, chuẩn bị bản local nếu không có mạng. Không cần internet khi node_modules và Python dependencies đã cài.
