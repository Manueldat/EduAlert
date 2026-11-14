# Xử lý lỗi trên Windows

| Triệu chứng | Cách kiểm tra và xử lý |
|---|---|
| npm/node không nhận diện | Cài Node 22 LTS hoặc 24, mở lại VS Code, thử node -v/npm -v |
| npm.ps1 bị chặn | Dùng npm.cmd thay npm; không cần đổi execution policy toàn máy |
| Python không tìm thấy | Dùng py -0p để xem bản cài, chọn Python 3.12 |
| Activate.ps1 bị chặn | Gọi trực tiếp .venv\Scripts\python.exe như README |
| No module named sklearn/fastapi | Cài requirements bằng đúng Python .venv, không dùng pip của môi trường khác |
| Cannot find @prisma/client | npm ci rồi npm run db:prepare ở thư mục gốc |
| Prisma provider/schema không đúng | Sửa DB_PROVIDER và DATABASE_URL cùng lúc; chạy lại db:prepare rồi restart backend |
| Seed báo database không rỗng | Đây là bảo vệ dữ liệu; dùng tài khoản đã seed, không reset tùy tiện |
| SQL Server connection refused | Kiểm tra TCP/IP, cổng, SQL authentication, database đã tạo và service đã chạy |
| SQL Server login failed | Kiểm tra login/password/database; ký tự đặc biệt cần escape theo cú pháp connection string |
| Docker SQL Server chưa healthy | Đọc docker compose logs sqlserver, kiểm tra RAM, mật khẩu, cổng1433, Linux container x86-64 |
| localhost:5500 không chạy app | Dùng localhost:5173 khi dev hoặc localhost:3000 sau build; không dùng Live Server |
| Port 3000/5173/8000 đang dùng | Dừng đúng tiến trình cũ bằng Ctrl+C; không chạy dev và Docker cùng cổng |
| Login đúng nhưng UI báo hết phiên | Kiểm tra dùng localhost nhất quán, COOKIE_SECURE=false với HTTP local; JWT_SECRET không đổi giữa các lần request |
| 403 khi lưu | Tài khoản không phải admin, hoặc origin không nằm trong ALLOWED_ORIGINS |
| ML trả model_missing | Chạy python -m ml.train rồi restart uvicorn |
| ML service key sai | Backend và ML phải đọc cùng ML_API_KEY; restart hai dịch vụ sau khi sửa .env |
| scikit-learn khác phiên bản | Cài requirements đúng rồi train lại; không dùng file model từ môi trường khác |
| Dashboard chưa có màu Xanh | Kiểm tra đã đánh giá và ML OK; thiếu ML không được giả định an toàn |
| Không nhận realtime | Đăng nhập hai browser context khác nhau, kiểm tra CVHT đúng lớp, socket connect và /socket.io proxy |
| Không có biểu đồ | Cần ít nhất một kỳ đã chốt; không nhập vào ô GPA riêng vì hệ thống tính từ điểm môn |
| Lỗi 409 dữ liệu thay đổi | Reload, kiểm tra bản mới rồi chạy đánh giá lại |

Để kiểm tra port trên PowerShell: `Get-NetTCPConnection -LocalPort 3000`. Xem OwningProcess trước khi tự dừng, tránh tắt nhầm chương trình khác.

Muốn tạo database demo mới mà vẫn giữ bản cũ: dừng backend, đổi DATABASE_URL SQLite sang `file:./demo2.db`, chạy db:prepare và db:seed. Không cần xóa dev.db.
