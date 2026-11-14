# EduAlert — Hướng dẫn bắt đầu

Project **Các công nghệ lập trình hiện đại** của Nguyễn Tiến Đạt và Nguyễn Nhật Tân.

Hệ thống hỗ trợ CVHT theo dõi lớp, kiểm tra dấu hiệu học tập hiện tại và dự báo kỳ tiếp theo. Đây là **bản chạy thử hoàn chỉnh với dữ liệu giả lập**. Quy tắc và nhãn demo không phải quy chế của một trường. Các chỉ số ML chỉ đo trên dữ liệu giả lập.

## 1. Chọn cách chạy

| Cách | Khi nào dùng | Database |
|---|---|---|
| A. Chạy nhanh ở máy cá nhân | Học code, test từng bước, chưa cài SQL Server | SQLite qua Prisma |
| B. Chạy theo stack đề tài | Demo SQL Server, đã có Docker Desktop | SQL Server 2022 + Prisma |
| C. SQL Server đã cài sẵn | Dùng SSMS và SQL Server của bạn | SQL Server + Prisma |

Hai profile dùng chung schema logic, API, giao diện, bộ quy tắc và mô hình. Không dùng SQLite để tuyên bố đã kiểm thử SQL Server; xem **reports/VERIFICATION.md**.

## 2. Cách A — Windows, VS Code, PowerShell

Cài Node.js **22 LTS (từ 22.12)** hoặc Node 24; Python **3.12**. Trong VS Code chọn **File → Open Folder → edualert**, rồi **Terminal → New Terminal**. Tất cả lệnh bên dưới chạy tại thư mục có file package.json gốc, không phải backend hoặc frontend.

Kiểm tra:

```powershell
node -v
npm -v
py -3.12 --version
```

### Lần đầu: cài thư viện và tạo cấu hình

```powershell
npm ci
npm run setup -- sqlite
npm run db:prepare
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r ml\requirements.txt
.\.venv\Scripts\python.exe -m ml.train
```

Không cần activate venv. Việc gọi trực tiếp python.exe tránh lỗi PowerShell chặn Activate.ps1. Nếu PowerShell chặn npm.ps1, dùng `npm.cmd` thay `npm` trong các lệnh.

`setup` tạo `.env` với khóa riêng ngẫu nhiên; không ghi đè file cấu hình đã có. `db:prepare` tạo database SQLite và Prisma Client. `ml.train` tạo dữ liệu giả lập, train và ghi mô hình vào artifacts/model.joblib.

### Terminal 1 — Chạy ML, giữ terminal mở

```powershell
.\.venv\Scripts\python.exe -m uvicorn ml.app:app --host 127.0.0.1 --port 8000
```

Mở http://127.0.0.1:8000/health, kết quả phải có `"status":"ok"`.

### Terminal 2 — Nạp dữ liệu và chạy website

```powershell

npm run db:seed
npm run dev
```

`db:seed` chạy **một lần trên database rỗng**, tạo 24 sinh viên, 2 lớp, 18 học phần, 6 kỳ và 3 tài khoản. Chạy lại sẽ từ chối ghi đè dữ liệu hiện có.

Mở **http://localhost:5173**. Backend ở http://127.0.0.1:3000/api/health.

| Tài khoản | Mật khẩu mặc định cho demo | Quyền |
|---|---|---|
| admin@edualert.local | EduAlert!2026 | Quản trị, nhập điểm, quản lý lớp/tài khoản |
| cvht.a@edualert.local | EduAlert!2026 | Chỉ lớp CNTT 24A |
| cvht.b@edualert.local | EduAlert!2026 | Chỉ lớp CNTT 24B |

Mật khẩu do DEMO_PASSWORD trong .env quy định **tại lần seed**. Thay .env sau seed không đổi mật khẩu đã băm trong database.

### Những lần chạy sau

Terminal 1: chạy lại uvicorn như trên. Terminal 2: `npm run dev`. Không cần cài lại thư viện, train lại hay seed lại.

Tắt chương trình bằng Ctrl+C trong mỗi terminal. Database được giữ nguyên.

### Linux/macOS

Thay `py -3.12` bằng `python3.12`, và `.\.venv\Scripts\python.exe` bằng `.venv/bin/python`. Các lệnh npm giống nhau.

## 3. Test theo thứ tự

1. Đăng nhập admin, xem Dashboard. Nếu seed lúc ML chưa chạy, bấm **Đánh giá toàn bộ** sau khi bật ML.
2. Vào Sinh viên → DEMO001 → xem GPA/CPA, quy tắc, dự báo, biểu đồ, môn còn nợ.
3. Bấm **Nhập điểm**, chọn Học kỳ 2, đổi điểm rồi **Lưu & đánh giá lại**.
4. Mở cửa sổ ẩn danh, đăng nhập cvht.a. Sửa điểm ở cửa sổ admin, quan sát thông báo cập nhật ở cửa sổ CVHT.
5. Trong Trung tâm cảnh báo, viết ghi chú, chọn Đang hỗ trợ rồi lưu. Reload: ghi chú vẫn còn.
6. Đăng nhập cvht.b: không thấy sinh viên CNTT 24A; mở trực tiếp `/students/s1` phải báo không tìm thấy trong phạm vi phụ trách.
7. Dừng ML, sửa điểm một hồ sơ: quy tắc vẫn hoạt động, ML báo chưa sẵn sàng, không gán nguy cơ 0%.
8. Chạy lại ML rồi Đánh giá lại. Xem Mô hình dự báo để đọc ngưỡng và chỉ số kiểm thử giả lập.

Chạy kiểm thử tự động trong terminal mới (nên dừng backend khi chạy npm test vì test tạo lại Prisma Client, sau đó khôi phục profile):

```powershell
npm test
.\.venv\Scripts\python.exe -m unittest ml.test_ml -v
npm run build
```

`npm test` dùng database test riêng, tự xóa database test và khôi phục Prisma Client. Không xóa dev.db. Test tích hợp Node dùng mock ML để kiểm soát lỗi; test dưới đây mới gọi mô hình thật:

```powershell
node scripts/smoke.mjs
```

Smoke cần backend + ML đang chạy và dữ liệu đã seed. Nó thêm một sinh viên giả lập tên “Sinh viên kiểm thử tự động”, kiểm tra kết quả ML, chống trùng và ghi chú, giữ lại hồ sơ test để kiểm tra. Không chạy trên dữ liệu thật.

Để tự khởi động hai dịch vụ trên cổng test, kiểm tra rồi tự đóng (cần đã build, seed và train):

```powershell
.\.venv\Scripts\python.exe scripts\e2e-local.py
```

Kiểm thử trình duyệt là phần tùy chọn, có script chuẩn bị sẵn nhưng **chưa chạy thành công trong môi trường tạo source**. Script dùng dữ liệu demo, cập nhật lại điểm mẫu không đổi và thêm một ghi chú tư vấn. Chạy trên máy nhóm:

```powershell
.\.venv\Scripts\python.exe -m pip install playwright
.\.venv\Scripts\python.exe -m playwright install chromium
.\.venv\Scripts\python.exe scripts\test-ui.py
```

Script mở API cổng 3400 và ML cổng 8400 rồi tự đóng; kết quả ghi reports/ui-tests.json. Nếu máy đã dùng các cổng này, hãy giải phóng cổng trước. Kiểm tra thủ công theo docs/05_KIEM_THU_DEMO.md vẫn cần thực hiện trước buổi bảo vệ.

## 4. Cách B — Toàn bộ stack SQL Server bằng Docker

Cài Docker Desktop, bật Linux containers, dành khoảng 6–8 GB RAM cho Docker. Xem giấy phép của SQL Server Developer trước khi tự chạy; cấu hình compose dùng edition Developer cho phát triển/demo và chấp nhận EULA qua ACCEPT_EULA.

```powershell
npm ci
npm run setup -- sqlserver
docker compose up --build -d
docker compose logs -f web
```

Nếu đã có .env SQLite, vẫn có thể chạy compose: compose tự đặt provider SQL Server và địa chỉ database trong container. `.env` chỉ cần các khóa đã được setup tạo. Profile SQLite trên máy không tự đổi.

Mở **http://localhost:3000**. Không chạy `npm run dev` cùng cổng 3000 khi dùng compose. Lần đầu Docker tải image, khởi tạo SQL Server, tạo database, train ML, build frontend và seed. Cần chờ healthcheck và dòng `EduAlert API`.

```powershell
docker compose ps
docker compose logs --tail 100 ml
docker compose logs --tail 100 sqlserver
docker compose down
```

`down` giữ volume database. Không thêm `-v` nếu muốn giữ dữ liệu.

## 5. Cách C — SQL Server có sẵn

Trong SSMS tạo database:

```sql
CREATE DATABASE edualert;
```

Bật TCP/IP cho SQL Server và xác định đúng cổng. Tạo SQL login có quyền với database edualert cho môi trường dev. Trong .env sửa:

```dotenv
DB_PROVIDER=sqlserver
DATABASE_URL="sqlserver://localhost:1433;database=edualert;user=YOUR_LOGIN;password=YOUR_PASSWORD;encrypt=true;trustServerCertificate=true"
```

`trustServerCertificate=true` chỉ dùng chứng chỉ tự ký ở môi trường local. Mật khẩu chứa ký tự đặc biệt theo cú pháp Prisma cần đặt giá trị trong `{...}`. Không dùng port SSMS tùy ý nếu instance thực tế dùng cổng khác.

Chạy lại `npm run db:prepare`, seed database rỗng và chạy hai terminal như cách A. Không cần đổi code React hay Python. `db:prepare` dùng db push cho demo ban đầu; xem docs/09_DEPLOYMENT.md để quản lý thay đổi schema có version.

## 6. Học và thực hiện đủ 12 bước

Đọc **docs/00_ROADMAP_VA_HUONG_DAN.md**. Tài liệu chỉ rõ làm gì, đọc/sửa file nào, chạy lệnh gì và kết quả cần kiểm tra cho từng bước.

| Tài liệu | Nội dung |
|---|---|
| docs/01_YEU_CAU_NGHIEP_VU.md | Yêu cầu, quyền, quy tắc, quyết định và phần chưa có dữ liệu thật |
| docs/02_DU_LIEU_ML.md | Mốc dự đoán, nhãn, dữ liệu giả lập, chia tập, thay bằng dữ liệu thật |
| docs/03_KIEN_TRUC_SO_DO.md | Kiến trúc, ERD, trình tự, trạng thái và cách tổ chức code |
| docs/04_API.md | API và ví dụ request |
| docs/05_KIEM_THU_DEMO.md | Test case và kịch bản bảo vệ |
| docs/06_BAO_CAO.md | Báo cáo kỹ thuật bản demo và hạn chế |
| docs/07_THUYET_TRINH.md | Dàn ý slide và lời dẫn demo |
| docs/08_XU_LY_LOI.md | Lỗi cài đặt, port, database, Prisma, Python, ML |
| docs/09_DEPLOYMENT.md | Local build, Docker, SQL Server và triển khai có HTTPS |
| docs/10_BACKLOG_PHAN_CONG.md | User story, tiêu chí nghiệm thu và lịch học lại code cho nhóm hai người |
| reports/VERIFICATION.md | Kết quả đã kiểm thử và phần chưa kiểm chứng |

## 7. Cấu trúc và phạm vi đã triển khai

Frontend: React, Tailwind, Recharts, Socket.io client. Backend: Express, Prisma, JWT trong cookie HttpOnly kèm session DB, kiểm tra lớp trên API và người nhận thông báo. ML: pandas, scikit-learn, hiệu chỉnh xác suất, FastAPI có service key.

Source không chứa node_modules, .env, tài khoản thật hay database đang chạy. Chứa package-lock.json, mô hình giả lập đã train và mã train để tái tạo. Pin Prisma 6.19.3 có chủ đích; không chạy nâng major tự động. Có override deepmerge-ts 8.0.2 cho dependency CLI, đã kiểm tra bằng bộ test đi kèm.

Phạm vi còn mở rộng: dữ liệu thật/quy chế thật, tiến độ chương trình không tuyến tính theo từng ngành/khóa, nhiều môn tiên quyết, nhập CSV/Excel, email, tài khoản sinh viên. Gợi ý tư vấn hiện dựa trên quy tắc và môn nợ; ML chưa dùng kế hoạch kỳ tới hoặc điểm tuyển sinh. Không gán dữ liệu thiếu bằng dữ liệu tưởng tượng.

Hai cổng dev là 5173 (web) và 3000 (API), ML là 8000. **Không dùng Live Server port 5500 để chạy project này.**

| Chức năng trên giao diện | Quản trị viên | Cố vấn học tập |
|---|---|---|
| Xem dữ liệu sinh viên | Xem tất cả các lớp trong hệ thống | Chỉ xem lớp được phân công |
| Nút **Đánh giá toàn bộ** trên Tổng quan | Có, đánh giá lại tất cả hồ sơ | Không có |
| Nút **Thêm sinh viên** ở danh sách sinh viên | Có | Không có |
| Nút **Sửa hồ sơ** trong trang chi tiết | Sửa MSSV, họ tên, lớp, kỳ nhập học, điểm xét tuyển và trạng thái | Không được sửa |
| Nút **Nhập điểm** trong trang chi tiết | Nhập/sửa điểm, chọn môn trong kỳ, lưu nháp hoặc chốt kết quả | Không được nhập/sửa |
| Ghi nhận bảo lưu hoặc cảnh cáo đã có quyết định | Có, trong form cập nhật học kỳ | Không được thay đổi |
| Mục **Quản trị dữ liệu** trên menu trái | Có | Không hiển thị |
