# API và hợp đồng dữ liệu

Base local: `http://localhost:3000/api`. Frontend dev dùng proxy `/api` qua Vite. JSON UTF-8. API ghi yêu cầu Content-Type application/json. Cookie `edualert` HttpOnly được set khi đăng nhập; không truyền JWT qua query string.

| Method | Route | Quyền / nội dung |
|---|---|---|
| GET | /health | Công khai; kiểm tra kết nối DB |
| POST | /auth/login | email, password; tạo session |
| GET | /auth/me | Người dùng hiện tại |
| POST | /auth/logout | Thu hồi session, ngắt socket |
| GET | /catalog | Lớp trong phạm vi, môn, kỳ, chương trình, quy tắc |
| GET | /dashboard | Thống kê trong phạm vi |
| GET | /students?q=&classId=&priority=&page=1 | Tìm, lọc; 10 bản ghi/trang |
| GET | /students/:id | Hồ sơ, bảng điểm, tổng hợp, đánh giá, tư vấn |
| POST | /students | ADMIN tạo hồ sơ |
| PUT | /students/:id | ADMIN sửa hồ sơ, tăng revision, đánh giá lại |
| PUT | /students/:id/semester | ADMIN thay bảng điểm kỳ trong transaction, audit |
| POST | /students/:id/assess | ADMIN/CVHT đúng lớp đánh giá lại |
| POST | /assess-all | ADMIN; chạy tuần tự từng hồ sơ cho quy mô demo |
| GET | /alerts?workflow=&severity=&q= | Cảnh báo trong phạm vi; tìm MSSV, tên hoặc lớp |
| POST | /alerts/:alertId/notes | Ghi chú và workflow, không sửa nguy cơ |
| GET | /model | Thông tin mô hình qua backend |
| POST | /admin/users | ADMIN tạo CVHT |
| POST | /admin/classes | ADMIN tạo lớp |
| PATCH | /admin/classes/:id | ADMIN đổi advisorId |
| POST | /admin/terms | ADMIN tạo kỳ theo ordinal duy nhất |
| POST | /admin/programs | ADMIN tạo chương trình |
| POST | /admin/courses | ADMIN tạo học phần, tiên quyết tùy chọn |
| GET | /admin/audit | ADMIN xem 100 lần thay đổi/đánh giá gần nhất |

## Ví dụ: PowerShell kiểm tra

```powershell
$login = @{email='admin@edualert.local';password='EduAlert!2026'} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method Post -ContentType 'application/json' -Body $login -SessionVariable eduSession
Invoke-RestMethod -Uri 'http://localhost:3000/api/students/s1' -WebSession $eduSession
Invoke-RestMethod -Uri 'http://localhost:3000/api/students/s1/assess' -Method Post -ContentType 'application/json' -Body '{}' -WebSession $eduSession
```

Ví dụ body lưu điểm: `grades` là toàn bộ danh sách của kỳ đã chọn; các môn bỏ khỏi danh sách sẽ bị loại khỏi bản hiện tại, nhưng before/after được lưu trong Audit.

```json
{
  "termId": "term-2",
  "finalized": true,
  "paused": false,
  "officialWarning": false,
  "grades": [
    {"courseId":"c7","score":2.5},
    {"courseId":"c8","score":3.0}
  ]
}
```

Học kỳ nháp cho phép score=null. Chốt kỳ yêu cầu tất cả điểm. Bảo lưu phải grades=[] và officialWarning=false. Sửa cùng kỳ không phải một lần học lại mới.

## Dự báo nội bộ

`POST http://127.0.0.1:8000/predict`, header X-ML-Key từ .env. Input:

```json
{"features":{"gpa":2.3,"cpa":2.6,"gpa_drop":0.6,"failed_ratio":0.166667,"debt_credits":9,"progress_ratio":0.75,"prereq_failures":0,"warning_count":0}}
```

Output gồm probability (0..1), level, thresholds, modelVersion, policyVersion, featureSchema, dataType=SYNTHETIC và explanation. Không gửi tên/MSSV tới ML. Pydantic từ chối trường lạ, vô cực, ngoài khoảng. Backend kiểm tra hợp đồng phiên bản và điểm trước khi lưu.

Status mlStatus: OK, UNAVAILABLE hoặc INSUFFICIENT. Trường probability là null khi không có dự báo; không dùng 0 để biểu diễn lỗi. Khi ML phục hồi, đánh giá lại tạo snapshot khác trạng thái.

## Mã lỗi

400 dữ liệu không hợp lệ; 401 chưa đăng nhập; 403 sai quyền admin/Origin; 404 không tồn tại hoặc không thuộc phạm vi; 409 trùng dữ liệu hoặc revision vừa thay đổi; 415 sai Content-Type; 429 quá nhiều lần đăng nhập; 503 ML chưa sẵn sàng trên trang model. Lưu điểm vẫn có thể trả 200 với mlStatus=UNAVAILABLE để báo đã lưu điểm thành công nhưng chưa dự báo.

Socket event `academic:update`: studentId, priority, assessmentId. Không nhận room từ client; backend tự cấp người nhận theo phân công. Payload là tín hiệu reload, không thay thế truy vấn API được phân quyền.
