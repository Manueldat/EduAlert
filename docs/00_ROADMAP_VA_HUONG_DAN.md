# Thực hiện EduAlert từ bước 1 đến bước 12

Đọc theo thứ tự này để hiểu và tự trình bày sản phẩm. Bộ source đã thực hiện luồng chính; bạn có thể chạy ngay bằng README, rồi đi lại từng bước để nắm code. Không cần copy rời từng đoạn vào dự án khác.

## Bước 1 — Yêu cầu, phạm vi và nghiệp vụ

Đọc `01_YEU_CAU_NGHIEP_VU.md`. Chốt hai vai trò ADMIN/ADVISOR, trường hợp cập nhật điểm và hỗ trợ CVHT. Phân biệt ba thứ: quyết định học vụ đã nhập, đánh giá quy tắc/ML, và trạng thái xử lý của CVHT.

Thực hành: chọn một sinh viên demo, viết ra “Ai nhập điểm? Ai nhận cảnh báo? Ai ghi chú?”. Đối chiếu với bảng quyền. Output bước này là đặc tả trong docs, chưa phải database.

Quy chế trường và nguồn dữ liệu thật vẫn chưa được cung cấp. Dự án triển khai theo profile demo có ghi nhãn rõ; không lấy các ngưỡng demo để tự động quyết định thôi học.

## Bước 2 — Dữ liệu và bài toán ML

Đọc `02_DU_LIEU_ML.md`, `ml/train.py`, `shared/demo-policy.json`. Mỗi mẫu là trạng thái sinh viên cuối kỳ t; nhãn tính từ kết quả kỳ t+1. HK1 có GPA nhưng chưa có mức giảm GPA. Dữ liệu giả lập tạo kết quả học phần của tương lai có nhiễu trước khi tính nhãn.

Thực hành sau khi cài Python: `python -m ml.train`. Mở `artifacts/training_rows.csv` trong VS Code và kiểm tra hai dòng cùng student_key: term=1 không có gpa_drop, term=2 có gpa_drop. `y_next_demo_warning` không xuất hiện trong FEATURES.

Output: tập dữ liệu giả lập, bảng đặc trưng và quy định chia tập. Không dùng MSSV, tên hoặc dữ liệu tương lai làm đặc trưng.

## Bước 3 — Công nghệ và kiến trúc

Đọc `03_KIEN_TRUC_SO_DO.md`. React gọi Express; Express kiểm tra quyền, đọc database và gọi FastAPI. Socket.io báo sự thay đổi để React tải lại dữ liệu theo quyền.

Thực hành: cài Node/Python theo README, mở thư mục gốc bằng VS Code, chạy `npm ci`, `npm run setup -- sqlite`. File .env là cấu hình riêng của máy, không đưa lên GitHub. Dùng `git init`, `git add .`, `git commit -m "Initial EduAlert demo"` khi bạn muốn quản lý source; cấu hình Git theo máy của bạn trước nếu chưa có.

Phân công đề xuất: Đạt phụ trách backend/DB/tích hợp; Tân phụ trách giao diện và biểu đồ; cả hai đọc dữ liệu, huấn luyện ML, viết kiểm thử và báo cáo. Nhóm tự đổi theo thế mạnh; đây không phải phân công đã xác nhận.

Output: repository cục bộ, môi trường và sơ đồ. Project không tự tạo GitHub repo hoặc gửi mã ra tài khoản của bạn.

## Bước 4 — Database và Rule-based

Đọc `backend/prisma/models.prisma`, `backend/src/academic.mjs`. Chạy `npm run db:prepare`. Với SQLite, file database nằm ở backend/prisma/dev.db. Với SQL Server, Prisma tạo các bảng tương đương trong database đã cấu hình.

Quan hệ quan trọng: User → AdvisingClass → Student → Semester → Grade → Course. Một cặp Student–Term chỉ có một Semester; một cặp Semester–Course chỉ có một Grade. Học lại ở kỳ khác là bản ghi khác. Điểm sửa trong cùng kỳ là thay thế có nhật ký Audit.

Đọc hàm calculate trước, sau đó rules và priority. Calculate tạo GPA/CPA và đặc trưng; rules giải thích điều kiện hiện tại; priority chọn mức ưu tiên để CVHT sắp xếp. UNKNOWN không biến thành GREEN khi ML lỗi.

Test: `npm run test:unit`. Đọc từng assertion trong backend/test/academic.test.mjs để hiểu tín chỉ đạt duy nhất, trọng số điểm và điều kiện sát ngưỡng.

## Bước 5 — Giao diện và luồng thao tác

Đọc `frontend/src/App.jsx` và `style.css`. Routes chính: `/`, `/students`, `/students/:id`, `/alerts`, `/model`, `/admin`. Components tương ứng Dashboard, Students, StudentDetail, Alerts, Model, Admin.

Thực hành: sau khi chạy hệ thống, đi từ dashboard đến sinh viên đến ghi chú tư vấn. Xem ảnh hưởng khi thu hẹp trình duyệt. Biểu đồ giải thích ML là độ nhạy khi thay một biến bằng trung vị, không phải tổng đóng góp cộng thành xác suất.

Output: các màn hình đã thực thi. Sau này có thể tách App.jsx thành thư mục pages/components khi nhóm thêm tính năng; hiện giữ components có tên rõ để người mới dễ theo dõi.

## Bước 6 — Backend, đăng nhập và quy tắc

Đọc `backend/src/app.mjs`, `assessment.mjs`, `server.mjs`. App chứa API; assessment điều phối đánh giá và lưu trữ; server ghép HTTP với Socket.io.

Thực hành: chạy ML rồi seed, mở hai cửa sổ với tài khoản khác nhau. Với CVHT B, mở hồ sơ /students/s1 sẽ bị từ chối. ADMIN có thể tạo tài khoản cố vấn, chương trình, kỳ, môn, lớp và sinh viên.

Test: `npm test`. Dùng database test riêng, có cả case 401, 403, 404, 400, cảnh báo không trùng và ML gián đoạn. Nên dừng backend đang chạy trước test vì test regenerate Prisma Client, rồi khởi động lại backend.

## Bước 7 — Huấn luyện và đánh giá ML

Đọc `ml/train.py`. Pipeline gồm SimpleImputer, StandardScaler cho logistic và classifier. So sánh LogisticRegression/RandomForest trên tập selection, hiệu chỉnh sigmoid trên calibration, chọn ngưỡng trên threshold, cuối cùng chấm test.

Thực hành: chạy `python -m ml.train`, mở `reports/ml-metrics.json`. Đọc confusion matrix theo thứ tự TN, FP, FN, TP. Giải thích vì sao muốn recall cao có thể làm tăng số cảnh báo nhầm. Chỉ báo cáo đây là thực nghiệm giả lập.

Test: `python -m unittest ml.test_ml -v`. Mô hình được tái tạo bằng seed cố định. Khi đổi library version hoặc quy tắc nhãn, train lại trước khi phục vụ dự đoán.

## Bước 8 — API dự đoán và tích hợp

Đọc `ml/app.py`. API xác thực bằng X-ML-Key giữa hai dịch vụ; frontend không nhận khóa. Chạy `python -m uvicorn ml.app:app --host 127.0.0.1 --port 8000`. `/health` báo ok khi đã nạp model.

Thực hành: mở trang hồ sơ và bấm Đánh giá lại. Đọc trạng thái ML, kỳ mục tiêu và modelVersion. Dừng ML rồi đánh giá: hệ thống lưu trạng thái UNAVAILABLE, giữ phần quy tắc, không tạo số dự báo giả.

Test thực tế: backend và ML cùng chạy, `node scripts/smoke.mjs`. Kết quả backend phải bằng gọi ML trực tiếp trên đúng features, sai số dưới 1e-12.

## Bước 9 — Kết nối frontend

Đọc `frontend/src/api.js`, hook useData trong App.jsx. API dùng cookie HttpOnly; Vite proxy /api và /socket.io để frontend cùng origin. Backend phục vụ frontend đã build khi chạy chế độ production local.

Thực hành: thử tìm MSSV, lọc lớp/nguy cơ, chuyển trang; thêm sinh viên; lưu học kỳ nháp thiếu điểm rồi chốt sau khi điền đủ; ghi chú chứa tiếng Việt. Giao diện phải báo lỗi hữu ích khi dữ liệu không hợp lệ.

Output: luồng đầy đủ từ form đến database và dự báo. Xem DevTools → Network nếu muốn hiểu request; không cần sửa browser storage để đăng nhập.

## Bước 10 — Realtime và tư vấn

Đọc notify và Socket middleware trong server.mjs. Socket chỉ nhận thông báo sau xác thực session. Người nhận là CVHT đang được phân công cho lớp và admin, không phải tất cả người đang kết nối.

Thực hành: admin cập nhật điểm ở cửa sổ thường, CVHT A ở cửa sổ ẩn danh nhận toast. CVHT B không nhận sự kiện lớp A. Đăng xuất làm ngắt socket session. Khi reconnect, frontend tải lại dữ liệu lưu trong DB để bù sự kiện bị bỏ lỡ.

Lưu ghi chú “Đã tư vấn” và RESOLVED không đổi risk. Khi nguy cơ tăng trở lại, dashboard vẫn phản ánh nguy cơ; ghi chú cũ không bị xóa.

## Bước 11 — Kiểm thử và triển khai

Chạy npm test, unittest, npm run build và smoke theo README. Xem `05_KIEM_THU_DEMO.md`. Không chạy test trên database chứa dữ liệu thật.

Build local: dừng npm run dev, chạy `npm run build`, sau đó `npm start` và mở localhost:3000; ML vẫn chạy terminal riêng. Docker SQL Server: đọc `09_DEPLOYMENT.md` và dùng compose.yaml. Khi dùng SQL Server cài sẵn, đổi .env rồi regenerate schema/client; không copy file SQLite sang SQL Server.

Output: bản build và cấu hình triển khai. Việc chạy thực tế Docker/SQL Server trên máy bạn là bước kiểm chứng bổ sung vì môi trường tạo source không có Docker hay SQL Server engine.

## Bước 12 — Báo cáo và bảo vệ

Đọc `06_BAO_CAO.md`, `07_THUYET_TRINH.md`, reports/VERIFICATION.md. Báo cáo đã có cơ sở kỹ thuật; bổ sung tên trường, lớp học phần, giảng viên và ảnh demo từ máy nhóm. Không bịa những thông tin này.

Demo 6–8 phút: mục tiêu → dashboard → hồ sơ → đổi điểm → realtime → ghi chú → mô hình → test và giới hạn. Mỗi thành viên cần trả lời được tại sao hiện tại và dự báo là hai kết quả khác nhau; vì sao dữ liệu giả lập không chứng minh hiệu quả thực tế.

Kết thúc: nộp source, README, docs, báo cáo thực nghiệm và bản demo theo yêu cầu thầy. Danh sách việc mở rộng có trong 01_YEU_CAU_NGHIEP_VU.md, không được trình bày là đã triển khai.
