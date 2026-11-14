# Kịch bản slide và phân công thuyết trình đề xuất

Đây là nội dung để nhóm dựng slide theo mẫu của giảng viên, không phải file PowerPoint đã thiết kế.

| Slide | Nội dung | Điều cần nói |
|---|---|---|
| 1 | EduAlert, nhóm, môn học | Bài toán hỗ trợ CVHT từ hồ sơ học tập |
| 2 | Vấn đề và người dùng | Nhiều dữ liệu, cần tổng hợp và ưu tiên hỗ trợ |
| 3 | Phạm vi | Hai vai trò, quy tắc hiện tại, dự báo kỳ tới, ghi chú |
| 4 | Kiến trúc | Vai trò React/Express/Prisma/Socket/FastAPI |
| 5 | Dữ liệu và nghiệp vụ | GPA có trọng số, tín chỉ duy nhất, học lại, bảo lưu |
| 6 | Rule-based và ML | Hiện tại khác tương lai; mô hình không quyết định thôi học |
| 7 | Huấn luyện | Dữ liệu giả lập, nhãn t+1, chia tập, chống leakage |
| 8 | Kết quả thực nghiệm | Chép số từ reports mới nhất; phân biệt precision/recall |
| 9 | Demo | Đổi điểm → cảnh báo realtime → tư vấn |
| 10 | Kiểm thử và hạn chế | Quyền, thiếu dữ liệu, ML lỗi; chưa kiểm định trên sinh viên thật |

Đạt có thể trình bày backend/DB; Tân trình bày UI/demo; cả hai giải thích mô hình. Đổi phân công theo thực tế nhóm.

## Các câu hỏi cần luyện

- Vì sao dùng cả Node và Python? Node xử lý nghiệp vụ web; Python thực hiện ML, tách bằng hợp đồng HTTP.
- Vì sao 65% trên prototype chưa đủ để kết luận? Trọng số minh họa khác mô hình đã huấn luyện và kiểm định; kể cả mô hình ở đây chỉ được thử trên dữ liệu giả lập.
- Vì sao không dùng accuracy đơn lẻ? Nhóm ít có thể bị bỏ sót; precision/recall và confusion matrix cho thấy chi phí sai sót.
- Vì sao không random split từng dòng? Cùng sinh viên nhiều kỳ và thông tin tương lai có thể làm test quá dễ.
- Thiếu ML thì sao? Lưu điểm, quy tắc vẫn hoạt động; trạng thái ML lỗi rõ ràng, không trả 0% giả.
- Đã tư vấn có hết cảnh báo không? Không. Workflow và đánh giá học tập độc lập.
- SQL Server đã test chưa? Trả lời đúng theo reports/VERIFICATION.md và kết quả trên máy nhóm; không nói đã test engine nếu chỉ validate schema.
