# Chạy bản build và SQL Server

## Production build trên máy cá nhân

Chạy `npm run build`, giữ ML trên port8000, chạy `npm start` rồi mở localhost:3000. Express phục vụ frontend/dist và API cùng origin. Không cần Vite trong chế độ này. Đây là cách demo offline sau khi đã cài thư viện.

## SQL Server bằng Docker Compose

compose.yaml khởi động SQL Server Developer, init database, ML và web. ML train khi container khởi động, web seed chỉ khi database chưa có user. SQL data được giữ trong named volume. Server web và SQL chỉ bind localhost; ML không publish ra host.

Thực hiện README mục B. Cấu hình dùng ACCEPT_EULA=Y; người triển khai phải tự xem và chấp thuận điều khoản SQL Server trước khi chạy. Không tự public lên mạng hoặc thay cài đặt tài khoản bên ngoài.

Không có Docker/SQL Server engine trong môi trường tạo mã nguồn. SQL schema được validate và DDL được sinh, nhưng compose/engine cần chạy trên máy nhóm để xác nhận. Nếu engine bị lỗi, đọc log, không dùng kết quả SQLite để kết luận SQL Server đã hoạt động.

## Schema và migration

`backend/prisma/models.prisma` là schema logic nguồn. `scripts/db.mjs` sinh active.prisma theo provider; SQL Server có native type NVARCHAR(191)/NVARCHAR(MAX), FK NoAction để tránh nhiều cascade paths. `backend/prisma/sqlserver-init.sql` là DDL tạo mới từ schema SQL Server; chỉ dùng trên database rỗng. Không chạy lại DDL để nâng cấp database có dữ liệu.

db:prepare dùng Prisma db push cho môi trường demo. Khi chuyển sang quản lý migration:

1. Dùng database phát triển SQL Server mới và chọn SQL Server profile.
2. Sinh active schema bằng `node scripts/db.mjs validate`.
3. Chạy `npx prisma migrate dev --schema backend/prisma/active.prisma --name initial` trên database mới. Cần quyền tạo shadow database hoặc cấu hình shadow database riêng.
4. Commit thư mục migrations; môi trường triển khai dùng `npx prisma migrate deploy --schema backend/prisma/active.prisma`.
5. Nếu database đã có do db push, thực hiện quy trình baseline của Prisma trước; không reset database có dữ liệu.

Không dùng cùng lịch sử migration SQL cho SQLite và SQL Server. Khi đổi provider cần database riêng, không tự chuyển dữ liệu.

## Nếu đưa lên máy chủ công khai sau này

Chuẩn bị host Node/Python/SQL Server, domain và reverse proxy HTTPS. Giữ ML và database trong private network. Set COOKIE_SECURE=true, JWT_SECRET và ML_API_KEY riêng, ALLOWED_ORIGINS đúng domain. Dùng SQL login tối thiểu quyền và chứng chỉ DB hợp lệ thay SA/self-signed. Tạo admin riêng, không dùng mật khẩu demo hoặc seed giả lập cho dữ liệu thật.

Cần thêm backup, logging có kiểm soát thông tin, hàng đợi đánh giá với retry/idempotency và quản trị phiên/người dùng. Phiên bản hiện tại dùng một Node process, không có cơ chế điều phối đa instance. Không tuyên bố sẵn sàng production cấp trường.
