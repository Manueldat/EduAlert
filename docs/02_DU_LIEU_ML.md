# Dữ liệu và mô hình

## Mục tiêu, mốc dự đoán

Tại cuối kỳ t đã chốt kết quả, ước lượng nguy cơ thỏa điều kiện học vụ **demo** ở kỳ lịch t+1. Bản đầu bắt đầu dự đoán từ cuối HK1. Gpa_drop thiếu ở HK1 là thiếu có cấu trúc, không phải không giảm điểm.

Nếu sinh viên bảo lưu ở kỳ dự kiến hoặc không còn học, không tự gán kết quả bình thường. Hệ thống thật phải quy định kỳ lịch/kỳ học tiếp theo và quan sát nhãn phù hợp.

## Đặc trưng dùng trong v1

| Trường | Cách tính ở thời điểm t |
|---|---|
| gpa | Điểm trung bình có trọng số của kỳ đã chốt gần nhất |
| cpa | Điểm cao nhất theo học phần, tổng hợp có trọng số |
| gpa_drop | GPA t−1 trừ GPA t, null nếu không có hai kỳ liên tiếp |
| failed_ratio | Tín chỉ không đạt kỳ t / tín chỉ đăng ký kỳ t |
| debt_credits | TC của các môn chưa từng đạt tính đến t |
| progress_ratio | TC đạt duy nhất / mốc TC chuẩn tính đến t |
| prereq_failures | Số lần học không đạt lớn nhất trong các môn nợ đang chặn môn tiếp theo |
| warning_count | Số quyết định cảnh cáo đã có tại thời điểm t; dữ liệu giả lập dùng cờ demo |

Tên, MSSV, lớp không đưa vào mô hình. Điểm xét tuyển lưu để quản lý nhưng không vào FEATURES. Không đưa kế hoạch tương lai chưa được ghi nhận, kết quả kỳ t+1, hoặc nhãn vào X.

## Dữ liệu giả lập

ml/train.py tạo 1.960 sinh viên thuộc 7 khóa giả lập; mỗi sinh viên có 3 kỳ điểm và hai mẫu dự báo (cuối kỳ 1→2; cuối kỳ 2→3), tổng 3.920 mẫu. Khả năng học tập tiềm ẩn, biến động từng kỳ, điểm từng môn và biến cố ngẫu nhiên tạo diễn biến có nhiễu. Nhãn được tính từ kết quả kỳ sau, không sao chép mức cảnh báo kỳ hiện tại.

Điểm tốt nhất, tín chỉ duy nhất, học lại, tiến độ và số cảnh báo được tính theo cùng quy ước học tập của demo. Mô phỏng không đại diện được mọi khác biệt ngành học, phương thức tuyển sinh hoặc nguyên nhân nghỉ học; không chứng minh giá trị triển khai thật.

| Tập | Khóa giả lập | Vai trò |
|---|---|---|
| Train | 2005, 2008, 2011 | Học tiền xử lý và tham số mô hình |
| Selection | 2014 | So sánh LogisticRegression/RandomForest theo average precision |
| Calibration | 2017 | Học phép hiệu chỉnh sigmoid từ điểm gốc |
| Threshold | 2020 | Chọn ngưỡng Vàng và Đỏ |
| Test | 2023 | Đánh giá cuối, không tham gia các lựa chọn trên |

Các khóa cách nhau để target_time của tập trước nhỏ hơn feature_time của tập sau. Sinh viên không xuất hiện ở nhiều tập. Test tự kiểm tra hai điều kiện này. Không dùng SMOTE. Giá trị trung vị, scale và chỉ báo thiếu đều chỉ fit trên train. Mô hình đã chọn không được fit lại với test.

## Chỉ số và ngưỡng

So sánh baseline DummyClassifier, LogisticRegression và RandomForest. Chỉ số gồm average precision (AP), ROC-AUC, Brier score, precision, recall, F1 và confusion matrix TN/FP/FN/TP. AP là diện tích PR theo định nghĩa average precision của thư viện, không gán nhãn accuracy.

Ngưỡng Vàng chọn mức cao nhất trên tập threshold vẫn đạt recall >=0.85 (nếu không đạt dùng fallback demo được ghi trong code). Ngưỡng Đỏ chọn F1 tốt nhất trong các mức ít nhất cao hơn Vàng 0.10. Ngưỡng được lưu cùng model, không hard-code trong React.

Xanh/Vàng/Đỏ là phân tầng hỗ trợ trên điểm mô hình. Nhãn huấn luyện vẫn nhị phân. Xác suất hiển thị chỉ đã được hiệu chỉnh trên dữ liệu giả lập; không diễn giải như xác suất đã được xác thực trên sinh viên thật.

## Giải thích

API lần lượt thay một đặc trưng bằng trung vị train và đo chênh lệch xác suất. Hiển thị điểm phần trăm (đ%), không gọi đó là SHAP, không cộng các số thành tổng xác suất, không xem là tác động nhân quả. Vì các biến có tương quan, phép thay riêng chỉ là phân tích độ nhạy cho demo.

## Đưa dữ liệu thật vào sau này

1. Thống nhất mục tiêu và quy chế theo khóa, giữ nguyên thời điểm dự đoán.
2. Lấy dữ liệu được phép dùng; thay tên/MSSV bằng khóa nghiên cứu để liên kết lịch sử.
3. Lưu điểm theo kỳ, lịch sử sửa điểm và thời điểm dữ liệu có sẵn; không dùng phiên bản sửa sau cutoff mà không ghi nhận.
4. Tạo các feature cùng schema academic-v1; tính nhãn tương lai theo quy chế, xử lý không quan sát được nhãn riêng.
5. Tách thời gian và sinh viên phù hợp, báo cáo chênh lệch nhóm/khóa, tỷ lệ missing/positive thực tế.
6. Train pipeline mới; chọn và kiểm định ngưỡng theo năng lực tư vấn; xem calibration, không chỉ accuracy.
7. Cấp modelVersion/featureSchema/policyVersion mới; đổi nhãn giao diện khỏi SYNTHETIC chỉ khi đã có quy trình kiểm định phù hợp.

Các bộ UCI/OULAD không mặc nhiên có nhãn “cảnh báo học vụ kỳ tới” theo trường Việt Nam. Chỉ sử dụng nếu xác định được mục tiêu và ánh xạ dữ liệu hợp lệ; không đổi dropout thành cảnh báo để làm đẹp chỉ số.

Nguồn kỹ thuật: https://scikit-learn.org/stable/common_pitfalls.html ; https://scikit-learn.org/stable/modules/calibration.html .

## Điều chỉnh so với phần bổ sung bước 2 trong tài liệu nhóm

Tài liệu tham chiếu: https://docs.google.com/document/d/1OBXiVBniBYcLM3Mhuu14px8IlP_3wiukoVK4sfPK0mg/edit?tab=t.xrf0d7tzcj5j (đọc ngày 08/11/2026).

- Cuối HK1 đã có điểm HK1; chỉ thiếu một GPA kỳ trước để tính biến động. Dự báo trước khi nhập học là bài toán khác, không dùng cùng pipeline hiện tại.
- Không mặc định tỷ lệ cảnh báo là 5–15%; đo tỷ lệ nhãn trên dữ liệu được chọn. Dữ liệu giả lập của bản này có tỷ lệ test khoảng 23.93%.
- Không tự thay kế hoạch kỳ tới chưa biết bằng một kế hoạch do hệ thống tưởng tượng. V1 bỏ các feature kế hoạch/tỷ lệ trượt học phần khi chưa có snapshot lịch sử đúng cutoff.
- Không áp dụng SMOTE mặc định. So sánh baseline trước, chọn ngưỡng trên tập riêng và báo cáo các chỉ số phù hợp.
- Các công thức/ngưỡng của tài liệu cần được đối chiếu quy chế trường. Bản source dùng demo-policy có nhãn minh họa rõ ràng, chưa tuyên bố áp dụng quy chế chính thức.
