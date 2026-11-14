# Backlog và kế hoạch làm việc của nhóm

Đây là kế hoạch đề xuất để hai bạn học, kiểm thử và hoàn thiện bản nộp từ source đã có. Không phải nhật ký công việc do hai thành viên đã thực hiện. Điều chỉnh mốc ngày sau khi biết hạn nộp.

| ID | User story | Tiêu chí nghiệm thu | File chính |
|---|---|---|---|
| US01 | Là CVHT, tôi muốn đăng nhập để xem dữ liệu được phân công | Sai tài khoản bị từ chối; phiên hết hạn cần đăng nhập lại | backend/src/app.mjs, server.mjs |
| US02 | Là quản trị viên, tôi muốn tạo lớp và phân công cố vấn | CVHT chỉ nhận quyền với lớp hiện được phân công | app.mjs; trang Admin |
| US03 | Là quản trị viên, tôi muốn tạo và sửa hồ sơ | MSSV không trùng; trạng thái và kỳ nhập học hợp lệ | Prisma Student; StudentForm |
| US04 | Là quản trị viên, tôi muốn nhập điểm theo kỳ | Không trùng môn, không chốt thiếu điểm, lưu nhật ký trước/sau | semester API; SemesterEditor |
| US05 | Là CVHT, tôi muốn xem GPA, CPA và tiến độ | Tín chỉ không cộng trùng khi học lại; biểu đồ dùng dữ liệu DB | academic.mjs; StudentDetail |
| US06 | Là CVHT, tôi muốn hiểu dấu hiệu hiện tại | Có lý do, ngưỡng và gợi ý tư vấn; dữ liệu thiếu không thành Xanh | academic.mjs; demo-policy.json |
| US07 | Là CVHT, tôi muốn xem dự báo kỳ tới | Kết quả gọi model thật, lưu version/kỳ mục tiêu; lỗi không thành 0% | assessment.mjs; ml/app.py |
| US08 | Là CVHT, tôi muốn xem sinh viên cần chú ý | Dashboard, tìm kiếm/lọc, phân trang trong đúng phạm vi | dashboard API; Dashboard, Students |
| US09 | Là CVHT, tôi muốn nhận cập nhật khi điểm đổi | Chỉ CVHT lớp liên quan và admin nhận; reload vẫn có kết quả | server.mjs; Socket.io |
| US10 | Là CVHT, tôi muốn ghi nhận tư vấn | Ghi chú lưu người/ngày/trạng thái; RESOLVED không xóa nguy cơ | Alert, Note; AlertItem |
| US11 | Là người đánh giá đồ án, tôi muốn kiểm chứng ML | Có train/selection/calibration/threshold/test; không lẫn sinh viên hoặc thời gian | ml/train.py; reports |
| US12 | Là thành viên nhóm, tôi muốn chạy lại dự án | Cài từ package-lock/requirements, setup/seed/build/test theo README | scripts; README |

## Ba đợt thực hành đề xuất

| Đợt | Đạt phụ trách đọc và trình bày | Tân phụ trách đọc và trình bày | Cả hai kiểm tra |
|---|---|---|---|
| 1 — Nền tảng | Yêu cầu, ERD, Prisma, tính GPA/CPA | Luồng màn hình, đăng nhập, dashboard | Chạy SQLite; phân quyền hai lớp; unit nghiệp vụ |
| 2 — Tích hợp | API cập nhật điểm, transaction, ML client | Hồ sơ, biểu đồ, cảnh báo, Socket.io | Train ML, kiểm tra cutoff/nhãn, mô phỏng mất dịch vụ |
| 3 — Bản nộp | Chạy thử SQL Server, log, báo cáo kiểm thử | Kiểm tra trình duyệt, chụp ảnh demo, chuẩn bị slide | Demo đầu-cuối; đối chiếu hạn chế và phân công thuyết trình |

## Điều kiện hoàn tất trước khi nộp

- Cả hai chạy được từ thư mục giải nén mới và giải thích được các bước trong README.
- Tự chạy test UI/thủ công trên trình duyệt máy nhóm, lưu kết quả thực tế.
- Nếu báo cáo sử dụng SQL Server, phải chạy SQL Server engine thật và ghi phiên bản/kết quả; không lấy test SQLite thay thế.
- Bổ sung trường, lớp học phần, giảng viên, ngày nộp, quy chế nếu có. Không đổi nhãn giả lập thành dữ liệu thật.
- Chuyển dàn ý docs/07_THUYET_TRINH.md thành slide theo mẫu thầy yêu cầu; docs/06_BAO_CAO.md là nội dung kỹ thuật để biên tập thành bản báo cáo nộp.
- Tạo repository GitHub trong tài khoản nhóm nếu cần, commit source và giữ .env/database ngoài Git. Bộ source không tự tạo tài khoản hoặc repository bên ngoài.
- Email, nhập CSV/Excel, dữ liệu trường và tiến độ theo từng ngành/khóa là backlog mở rộng, chưa phải chức năng đã hoàn thành.
