# EduAlert — Báo cáo kỹ thuật bản demo

**Môn:** Các công nghệ lập trình hiện đại. **Nhóm:** Nguyễn Tiến Đạt — 2451010014; Nguyễn Nhật Tân — 2451010039. Tên trường, giảng viên, lớp học phần và thời hạn: nhóm bổ sung theo thông tin thật.

## 1. Vấn đề và mục tiêu

CVHT cần kết nối nhiều thông tin học tập để lựa chọn sinh viên cần hỗ trợ. EduAlert tổng hợp tiến trình, kiểm tra dấu hiệu hiện tại, ước lượng nguy cơ kỳ tiếp theo và lưu lịch sử tư vấn. Đề tài thực hiện một quy trình khép kín từ nhập điểm đến hỗ trợ CVHT thay vì chỉ trình diễn một hàm dự báo.

Đầu ra không phải quyết định học vụ. Nhóm giữ riêng quyết định đã nhập, kết quả đánh giá và trạng thái xử lý. Bản thực nghiệm dùng dữ liệu giả lập và ngưỡng demo được định nghĩa trong shared/demo-policy.json.

## 2. Phạm vi và thiết kế

Hai vai trò gồm quản trị và cố vấn. Quản trị tạo dữ liệu nền và cập nhật điểm; cố vấn xem các lớp được phân công và ghi chú tư vấn. Chức năng bao gồm dashboard, danh sách sinh viên, chi tiết học tập, cảnh báo, mô hình và quản trị.

Kiến trúc React → Express → Prisma/DB; Express gọi dịch vụ FastAPI để suy luận. Huấn luyện chạy ngoại tuyến. Socket.io thông báo khi kết quả được lưu, frontend tải lại API theo quyền. Sơ đồ chi tiết trong 03_KIEN_TRUC_SO_DO.md.

## 3. Công nghệ và vai trò

React tổ chức giao diện theo component; Tailwind và CSS định nghĩa layout; Recharts thể hiện GPA và phân bố. Express xử lý API, xác thực và luồng nghiệp vụ. Prisma quản lý schema, quan hệ và transaction trên SQLite/SQL Server. Python và scikit-learn thực hiện tiền xử lý, huấn luyện, đánh giá; FastAPI cung cấp hợp đồng HTTP với validation. Socket.io nối sự kiện backend tới đúng người dùng.

SQLite là profile phát triển nhanh, SQL Server là profile stack đề tài. Môi trường kiểm thử phải được ghi rõ; kiểm tra schema SQL Server không tương đương chạy thành công SQL Server engine.

## 4. Nghiệp vụ học tập

GPA tính theo tín chỉ trong kỳ, CPA lấy điểm cao nhất từng môn theo giả định demo, tín chỉ đạt không cộng trùng. Kỳ thiếu/chưa chốt không được xem là bình thường. Bảo lưu không biến thành điểm 0. Bộ quy tắc đánh giá các chỉ số hiện tại và tạo gợi ý trả môn đang chặn tiên quyết.

Mỗi lần sửa tăng revision, lưu audit và tạo đánh giá mới khi fingerprint thay đổi. Một sinh viên có tối đa một Alert mỗi kỳ, nhiều Note và nhiều Assessment. Hệ thống tránh việc bấm đánh giá nhiều lần tạo nhiều cảnh báo trùng. Workflow được CVHT ghi nhận độc lập với nguy cơ.

## 5. Thực nghiệm ML

3.920 mẫu từ 1.960 sinh viên giả lập, mỗi sinh viên có ba kỳ; mô hình nhận dữ liệu cuối kỳ t để dự báo sự kiện demo ở t+1. Không đưa danh tính hay kết quả tương lai vào FEATURES. Train, selection, calibration, threshold và test tách theo khóa/sinh viên/thời gian.

LogisticRegression và RandomForest được so sánh bằng average precision trên selection. Pipeline tiền xử lý chỉ fit train. Sigmoid calibration fit tập riêng. Ngưỡng Vàng tối ưu theo mục tiêu recall, ngưỡng Đỏ theo F1 trong miền đã định. Test chỉ đánh giá sau khi đã chọn.

Kết quả cụ thể do chương trình thực thi nằm tại reports/ml-metrics.json và được trình bày trong reports/VERIFICATION.md. Khi train lại, dùng báo cáo mới, không sao chép số cũ. Các con số chỉ chứng minh hoạt động của quy trình trên dữ liệu sinh ra, không chứng minh chất lượng với dữ liệu trường.

Giải thích sử dụng độ nhạy: thay một đặc trưng bằng trung vị train, đo chênh lệch điểm. Đây không phải suy luận nhân quả và không phải các đóng góp cộng thành xác suất.

## 6. Kiểm thử

Kiểm thử gồm unit tính điểm và ranh giới quy tắc; integration HTTP, quyền, Prisma và Socket; test FastAPI/model parity; smoke nối Express tới ML thật; build frontend. Danh sách case và kịch bản thủ công nằm trong 05_KIEM_THU_DEMO.md. Kết quả thực thi được ghi trong reports; không tuyên bố các kiểm thử chưa chạy là đạt.

## 7. Giới hạn và phát triển tiếp

Chưa có dữ liệu thật hoặc quy chế trường. Chương trình đào tạo dùng mốc tín chỉ tuyến tính; một môn có tối đa một tiên quyết. Kế hoạch kỳ tới và tuyển sinh chưa vào ML vì thiếu snapshot lịch sử phù hợp. Chưa có email, CSV hàng loạt, tài khoản sinh viên hoặc quản lý học phí.

Vận hành demo một tiến trình, chưa tối ưu dữ liệu cấp toàn trường. Cần SQL Server integration test trên môi trường có engine, backup/restore, migration có version, tài khoản DB hạn chế quyền, HTTPS và quản trị vận hành khi triển khai thật. Trước ứng dụng ML vào thực tế, cần dữ liệu hợp lệ, đánh giá theo thời gian, calibration và rà soát hiệu quả theo nhóm/khóa.

## 8. Tài liệu tham khảo kỹ thuật

- React: https://react.dev/
- Prisma SQL Server: https://www.prisma.io/docs/orm/v6/overview/databases/sql-server
- Tailwind Vite: https://tailwindcss.com/docs/installation/using-vite
- Socket authentication middleware: https://socket.io/docs/v4/middlewares/
- FastAPI security: https://fastapi.tiangolo.com/tutorial/security/
- scikit-learn pitfalls: https://scikit-learn.org/stable/common_pitfalls.html
- scikit-learn calibration: https://scikit-learn.org/stable/modules/calibration.html

Nhóm bổ sung quy chế thật vào tài liệu tham khảo sau khi xác định nguồn và kiểm tra hiệu lực áp dụng; báo cáo demo không diễn giải các ngưỡng thử nghiệm thành quy định pháp luật.
