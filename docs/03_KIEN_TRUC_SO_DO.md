# Kiến trúc, dữ liệu và các sơ đồ

## Kiến trúc chạy ứng dụng

```mermaid
flowchart TB
  U["Admin / CVHT"] --> UI["React + Tailwind + Recharts"]
  UI -->|"REST + cookie phiên"| API["Express API"]
  API --> AUTH["Xác thực & phạm vi lớp"]
  AUTH --> SVC["Dịch vụ đánh giá"]
  SVC --> RULE["Quy tắc demo"]
  SVC -->|"HTTP + service key"| ML["FastAPI + mô hình đã train"]
  API --> ORM["Prisma"]
  SVC --> ORM
  ORM --> DB[("SQL Server / SQLite demo")]
  SVC --> SOCKET["Socket.io theo người nhận"]
  SOCKET -->|"Thông báo thay đổi"| UI
```

Không expose service key đến React. Client nhận sự kiện rồi tải lại API được kiểm tra quyền. Database là nguồn lưu bền vững, không dùng Socket thay database.

## Huấn luyện ngoại tuyến

```mermaid
flowchart TB
  D["Dữ liệu giả lập theo học kỳ"] --> SPLIT["Chia thời gian + sinh viên"]
  SPLIT --> TRAIN["Train pipeline"]
  TRAIN --> SELECT["So sánh ở selection"]
  SELECT --> CAL["Hiệu chỉnh ở calibration"]
  CAL --> TH["Chọn ngưỡng ở threshold"]
  TH --> TEST["Đánh giá test một lần"]
  TEST --> ART["Model + thông tin phiên bản"]
  ART --> API["FastAPI inference"]
```

Train không diễn ra khi bấm Đánh giá. Model artifact chứa model, calibrator, trung vị train, feature schema và metadata. Chỉ nạp artifact do nhóm tạo và tin cậy; joblib không phải định dạng an toàn cho file không rõ nguồn.

## ERD

```mermaid
erDiagram
  direction TB
  User ||--o{ Session : has
  User ||--o{ AdvisingClass : advises
  Program ||--o{ AdvisingClass : defines
  AdvisingClass ||--o{ Student : contains
  Student ||--o{ Semester : studies
  Term ||--o{ Semester : schedules
  Semester ||--o{ Grade : records
  Course ||--o{ Grade : graded
  Course o|--o{ Course : prerequisite
  Student ||--o{ Assessment : evaluated
  Student ||--o{ Alert : monitored
  Alert ||--o{ Note : discussed
  User ||--o{ Note : writes
  Student {
    string id PK
    string code UK
    string classId FK
    int entryOrdinal
    int revision
  }
  Semester {
    string id PK
    string studentId FK
    string termId FK
    boolean finalized
    boolean paused
    boolean officialWarning
  }
  Grade {
    string semesterId FK
    string courseId FK
    float score
  }
  Assessment {
    string fingerprint UK
    int revision
    string modelVersion
    string payload
  }
```

Audit là bảng nhật ký riêng lưu actorId, subjectId, action, details trước/sau. Không gắn cascade delete; bản demo không xóa sinh viên hoặc tài khoản chứa lịch sử. Các chuỗi payload/notes dùng NVARCHAR(MAX) ở SQL Server, trường khóa giới hạn 191 ký tự để tránh khóa index quá dài.

## Trình tự nhập điểm và đánh giá

```mermaid
sequenceDiagram
  participant A as Admin
  participant B as Backend
  participant D as Database
  participant M as ML
  participant C as CVHT
  A->>B: Lưu bảng điểm học kỳ
  B->>B: Xác thực, kiểm tra dữ liệu
  B->>D: Transaction điểm + revision + audit
  D-->>B: Commit
  B->>B: Tính GPA, CPA, quy tắc, features
  B->>M: Dự báo kỳ tiếp theo
  alt Mô hình sẵn sàng
    M-->>B: Điểm, level, phiên bản, độ nhạy
  else Timeout hoặc lỗi
    B->>B: ML = UNAVAILABLE
  end
  B->>D: Kiểm tra revision; lưu đánh giá, cảnh báo
  B-->>C: Socket: academic:update
  C->>B: Tải lại dữ liệu theo quyền
  B-->>A: Kết quả lưu và đánh giá
```

## Trạng thái xử lý cảnh báo

```mermaid
stateDiagram-v2
  [*] --> Moi
  Moi --> DangHoTro: Ghi nhận tư vấn
  DangHoTro --> DaXuLy: Hoàn tất việc hỗ trợ
  DaXuLy --> DangHoTro: Mở lại và ghi chú
  DangHoTro --> DangHoTro: Bổ sung ghi chú
```

Risk level và active được cập nhật từ đánh giá, độc lập workflow. Không xóa note khi mức nguy cơ giảm. Cảnh báo được gắn kỳ để không nhầm lịch sử với hiện tại.

## Tổ chức code và pattern

| Cách tổ chức | Vị trí | Lợi ích |
|---|---|---|
| Service layer | assessment.mjs | Một nơi điều phối tính điểm, ML, persistence, notification |
| Dependency injection | createApp(db,cfg,{predict,notify}) | Test lỗi ML và phạm vi realtime mà không giả DB |
| Strategy đơn giản | rules và predict | Kiểm tra hiện tại/dự báo có hợp đồng riêng |
| Observer / pub-sub | Socket.io academic:update | UI cập nhật khi có thay đổi |
| Pipeline | sklearn Pipeline | Tiền xử lý thống nhất train/inference |
| Repository qua ORM | PrismaClient | Truy vấn typed schema, transaction, đổi provider |

Không tự thêm lớp factory/singleton cho mọi entity. Đây là hệ thống lớp demo với hai dịch vụ, không cần gọi là hệ microservice đầy đủ.
