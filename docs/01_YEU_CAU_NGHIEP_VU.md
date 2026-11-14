# Yêu cầu và nghiệp vụ — baseline demo v1

## Mục tiêu và người dùng

EduAlert hỗ trợ CVHT biết sinh viên nào cần chú ý, vì sao và đã được hỗ trợ đến đâu. ADMIN kiêm nhập liệu đào tạo. ADVISOR chỉ xem các lớp được phân công. Sinh viên không đăng nhập ở phiên bản này.

## Danh sách yêu cầu và hiện thực

| ID | Yêu cầu | Hiện thực |
|---|---|---|
| F01 | Đăng nhập/phân quyền | JWT cookie HttpOnly, Session DB, kiểm tra quyền ở API và Socket |
| F02 | Quản lý sinh viên | Tạo/sửa, tìm kiếm, lọc, phân trang; không xóa lịch sử học tập |
| F03 | Quản lý kết quả | Nhập danh sách môn theo kỳ, lưu nháp/chốt, bảo lưu, lịch sử sửa điểm |
| F04 | Tổng hợp học tập | GPA có trọng số, CPA theo điểm cao nhất, tín chỉ đạt duy nhất, môn nợ |
| F05 | Kiểm tra hiện tại | Quy tắc demo có lý do, gợi ý tư vấn và version |
| F06 | Dự báo kỳ tiếp theo | ML huấn luyện, hiệu chỉnh, kiểm tra trên dữ liệu giả lập |
| F07 | Dashboard | Thống kê phạm vi được phép, phân bố nguy cơ và GPA |
| F08 | Cảnh báo | Lưu DB, một cảnh báo/sinh viên/kỳ, lịch sử đánh giá tách biệt |
| F09 | Tư vấn | Ghi chú bất biến theo lần lưu, người thực hiện, thời gian, trạng thái |
| F10 | Realtime | Cập nhật cho đúng CVHT/admin, tải lại DB sau reconnect |
| F11 | Quản trị | Tạo chương trình/môn/kỳ/CVHT/lớp, đổi phân công |
| F12 | Minh bạch ML | Model card, ngưỡng, metrics, nhãn giả lập, độ nhạy đặc trưng |

## Quy tắc demo (không quy chiếu quy chế pháp luật)

Nhãn tương lai bằng 1 nếu ở kỳ tiếp theo GPA < 1.4 HOẶC CPA < 1.8 HOẶC tín chỉ không đạt/tín chỉ đăng ký > 0.5 HOẶC tín chỉ chưa đạt còn nợ > 24. Các ngưỡng này chỉ phục vụ mô phỏng. Bộ quy tắc hiện tại dùng cùng điều kiện trên để đánh dấu Đỏ và các dấu hiệu hỗ trợ để đánh dấu Vàng:

- Mức giảm GPA = GPA kỳ trước − GPA kỳ hiện tại >= 0.5, chỉ nếu hai kỳ lịch liền nhau có điểm.
- CPA < 2.0; tiến độ < 0.7; nợ môn tiên quyết qua ít nhất 2 lần học; có cảnh cáo đã được nhập.
- Xanh hiện tại: đủ dữ liệu và không có dấu hiệu trên. UNKNOWN nếu thiếu dữ liệu.

GPA = tổng(điểm môn × tín chỉ)/tổng tín chỉ các môn có trong học kỳ đã chốt. CPA = trung bình có trọng số các điểm cao nhất của từng môn từ các kỳ đã chốt, kể cả môn chưa đạt. Điểm >=1 là đạt theo quy ước demo. Tín chỉ đạt không cộng trùng. Môn đã đạt không trở lại thành nợ khi học cải thiện điểm thấp hơn. Một kỳ tối đa 40 TC theo giới hạn nhập demo.

Mốc tiến độ = min(tổng TC chương trình, số kỳ từ nhập học trừ kỳ bảo lưu × TC chuẩn/kỳ). Đây là mốc tuyến tính đơn giản; cần bảng lộ trình từng ngành/khóa khi áp dụng thật.

Một môn có tối đa một môn tiên quyết; có thể chặn nhiều môn khác. Danh mục chỉ tạo mới để tránh vô tình thay đổi tín chỉ lịch sử. Các phiên bản chương trình và nhiều tiên quyết là mở rộng.

## Ba trạng thái độc lập

1. Semester.officialWarning là quyết định học vụ đã được nhập; hệ thống không tự tạo quyết định.
2. Rule level và ML level là hai kết quả riêng; priority trên dashboard lấy mức cao nhất để sắp xếp hỗ trợ. Nếu thiếu ML hoặc dữ liệu và không có dấu hiệu Vàng/Đỏ thì priority=UNKNOWN.
3. Alert.workflow là NEW → IN_PROGRESS → RESOLVED; có thể mở lại với ghi chú. Alert.active là dấu hiệu còn ở kỳ đó. RESOLVED không ép active=false, không ép màu Xanh.

## Ca sử dụng cập nhật điểm

Tiền điều kiện: admin đăng nhập, sinh viên/lớp/môn/kỳ tồn tại. Kiểm tra một môn không trùng trong kỳ, score 0–4, không chốt thiếu điểm, kỳ không trước nhập học. Giao dịch DB thay bảng điểm kỳ, tăng revision sinh viên và lưu Audit trước/sau. Đánh giá lại sau commit; ML lỗi không rollback điểm đã lưu. Assessment gắn revision và fingerprint chống trùng. Các lần đánh giá cũ vẫn lưu trong DB; UI hiển thị 15 lần gần nhất.

Nếu người dùng sửa một kỳ cũ, chương trình tính lại toàn bộ lịch sử và đánh giá tại kỳ mới nhất. Kết quả cũ được giữ như audit lịch sử, không âm thầm viết lại dự báo đã phát hành. Các lần đánh giá liên tiếp cùng dữ liệu/model/trạng thái được gộp; chuỗi OK → UNAVAILABLE → OK tạo snapshot phục hồi mới để trang hồ sơ luôn hiển thị trạng thái mới nhất. Alert vẫn duy nhất theo sinh viên/kỳ.

## Dữ liệu thiếu và trường hợp đặc biệt

- Cuối HK1 đã có GPA/CPA, gpa_drop=null; imputer học cách xử lý ở tập train.
- Thiếu bất kỳ kỳ từ nhập học đến kỳ mới nhất, kỳ chưa chốt, điểm null hoặc kỳ rỗng: chưa đủ điều kiện đánh giá hoàn chỉnh.
- Bảo lưu không phải GPA=0. Kỳ mới nhất bảo lưu hoặc sinh viên PAUSED/GRADUATED/WITHDRAWN: không chạy ML.
- Cảnh báo kỳ cũ vẫn hiển thị cùng nhãn học kỳ; không coi là nguy cơ hiện tại. Dashboard đọc assessment mới nhất theo revision.
- Không có nhãn kỳ tới trong dữ liệu huấn luyện: không gán y=0.

## Quyết định phạm vi so với ý tưởng ban đầu

| Ý tưởng | Quyết định v1 và lý do |
|---|---|
| SQL Server + Prisma | Có schema/DDL/compose; SQLite thêm cho chạy nhanh và kiểm thử |
| Dữ liệu thật từ trường | Chưa được cung cấp; sử dụng dữ liệu giả lập, không đoán tên trường/quy chế |
| Kế hoạch kỳ tới/tỷ lệ trượt học phần | Chưa dùng cho ML vì không có snapshot lịch sử ở thời điểm dự đoán |
| Điểm xét tuyển | Có thể lưu; chưa dùng cho ML để tránh tạo phép quy đổi giả |
| Thông tin học phí | Ngoài phạm vi cảnh báo học tập của v1 |
| Email/CSV/chatbot/mobile | Để mở rộng; không có nút giả hoạt động |
| Quyết định buộc thôi học | Không tự động hóa; chỉ hỗ trợ CVHT |

## Yêu cầu phi chức năng và giới hạn

Mật khẩu băm bcrypt; không trả hash về client; phiên đăng nhập lưu DB và có thời hạn; Origin kiểm tra cho request ghi; API ML chỉ backend giữ key. Rate limit login, kiểm tra dữ liệu bằng Zod/Pydantic. Demo một tiến trình Node, không Redis/message broker. Thuật toán dashboard tải toàn bộ sinh viên trong phạm vi rồi phân trang, phù hợp dữ liệu lớp demo; cần query/aggregation DB và hàng đợi tác vụ khi tăng quy mô.

Đánh giá một sinh viên tuần tự theo khóa trong process; revision tránh lưu kết quả sau thay đổi dữ liệu. Nếu xung đột trả 409 để đánh giá lại. Quyền dựa trên lớp hiện tại. Người nhận Socket được lấy từ phân công hiện tại mỗi lần phát.

Chưa có SLA hiệu năng production, quên mật khẩu/2FA, backup tự động hoặc kiểm định triển khai thật. Không trình bày các phần này là đã có.
