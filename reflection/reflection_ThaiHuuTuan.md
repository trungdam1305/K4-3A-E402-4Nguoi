# Bản Tự Nhận Định Cá Nhân (Individual Reflection)

**Mini Hackathon AI — Batch 04 · Lớp 3A**

---

## Thông tin cá nhân

- **Họ và tên:** Thái Hữu Tuấn
- **Mã học viên:** `2A202602465`
- **Lớp / Phòng / Cụm:** Lớp 3A · Phòng E402 · Cụm C1
- **Dự án:** VLearn Grounded Tutor (Track A — A1: Tối ưu AI tutor hiện có)
- **Vai trò chính:** Evaluation & Grounding Reviewer

---

## 1. Tôi đã tham gia vào phần nào và đóng góp cụ thể những gì?

Vai trò chính của tôi là kiểm tra độc lập xem kết quả của prototype có thật sự đúng hành vi, đúng nguồn và an toàn với học viên hay không. Tôi tập trung vào các case khó thay vì chỉ nhìn tỷ lệ đạt tổng.

| Khối công việc | Tôi đã trực tiếp làm gì? | Kết quả / Tác động tới dự án |
|---|---|---|
| **Rà soát độc lập 5 case khó** | Đọc lại câu hỏi, output và citation của GS-06, GS-09, GS-10, GS-11 và GS-12 trong Run 1; tự xác định hành vi mong đợi trước khi đối chiếu với kết quả của script. | Kết quả chấm tay trùng verdict của runner ở cả 5 case, đồng thời phát hiện giới hạn của cách chấm tự động chỉ dựa trên việc citation có nằm trong tập retrieved hay không. |
| **Kiểm tra grounding theo đúng ngữ cảnh** | Mở và đọc trực tiếp các đoạn nguồn mà câu trả lời đã dẫn, thay vì chỉ kiểm mã nguồn có tồn tại. Với GS-11, tôi xác định `T06-160` và `T06-161` nói về lab self-attention của phần khác, không phải phần "Tạo môi trường và chạy test baseline" mà học viên đang hỏi. | Phát hiện lỗi nguy hiểm nhất của Run 1: citation có thật và hỗ trợ câu trả lời, nhưng sai phần học nên vẫn có thể khiến học viên làm nhầm lab. |
| **Đề xuất Critical Gate** | Không chấp nhận kết luận Run 1 đạt chỉ vì tổng điểm là 17/20. Tôi đề xuất bổ sung điều kiện bắt buộc GS-10, GS-11 và GS-12 phải đạt 100%. | Quality bar được nâng thành 4 điều kiện; tỷ lệ tổng cao không còn có thể che lỗi lộ chỉ dẫn hoặc dẫn nhầm phần học. |
| **Kiểm tra cách báo cáo kết quả** | Phân biệt Run 1, Run 2 chính thức và các lượt thử không đủ điều kiện; dùng trung bình 3 lượt liên tiếp trên cùng commit làm kết quả Run 2. | Kết quả chính thức được trình bày trung thực: Run 2 đạt 18, 19, 19/20, trung bình **93,3%**, thay vì lấy một lượt 20/20 để đại diện cho cả mốc. |
| **Slide CP5 và phần trình bày kết quả** | Phụ trách nội dung slide về kết quả đo, quality bar và bài học từ failure case; chuẩn bị phần giải thích số liệu cho CP6. | Người nghe có thể thấy rõ chuẩn đã chốt, kết quả thực tế và lý do GS-11 quan trọng hơn việc chỉ trình bày một con số đẹp. |
| **Ghi nhận vòng validation** | Là người ghi trong phiên think-aloud với 4 willing users: ghi thao tác, chỗ do dự, lời nói nguyên văn và mức nghiêm trọng của từng vấn đề. | Tạo bằng chứng hành vi cho các vấn đề như thẻ nguồn không rõ là bấm được, icon báo nguồn sai khó hiểu và dropdown chọn phần học thiếu onboarding. |

**Dấu tay rõ nhất của tôi trong repo:**

- Mục **“Kiểm tra độc lập lần 2 — case khó”** trong `eval/run_results.md`.
- Điều kiện Critical Gate yêu cầu GS-10, GS-11 và GS-12 đều đạt.
- Phần kết quả đo và quality bar trong `demo-slides.pdf`.
- Vai trò người ghi trong `validation/feedback-log.md`.

---

## 2. Tôi đã dùng AI như thế nào trong quá trình làm việc?

| Giai đoạn | Tôi dùng AI để làm gì? | AI hữu ích ở đâu? | AI có thể sai hoặc hời hợt ở đâu? | Tôi đã kiểm soát bằng nhận định của mình như thế nào? |
|---|---|---|---|---|
| **Đọc kết quả eval** | Nhờ AI hỗ trợ tóm tắt cấu trúc output, nhóm các case theo `answer`, `clarify`, `not_found` và chỉ ra các case cần đọc kỹ. | Giúp tôi đi nhanh qua log dài và tập trung vào các case có rủi ro cao. | AI dễ coi một câu trả lời là grounded khi citation có thật và nội dung nghe hợp lý. | Tôi mở trực tiếp từng citation và đối chiếu với phần học đang được hỏi trước khi đưa ra verdict. |
| **Thiết kế quality bar** | Dùng AI để gợi ý các chiều kiểm thử ngoài tỷ lệ pass tổng, như prompt injection, citation bịa và critical case. | Giúp hệ thống hóa tiêu chí thành các điều kiện pass/fail rõ ràng. | AI có thể đề xuất quá nhiều tiêu chí hoặc tiêu chí khó kiểm chứng trong thời gian hackathon. | Tôi giữ lại 4 điều kiện đo được bằng dữ liệu hiện có và đặc biệt thêm critical gate cho ba case rủi ro cao. |
| **Rà soát số liệu và slide** | Nhờ AI đối chiếu các con số xuất hiện trong spec, file eval và slide. | Phát hiện nhanh chỗ dễ nhầm giữa Run 2 trung bình 93,3% và một lượt hồi quy 20/20. | AI có thể ưu tiên con số đẹp nhất mà bỏ qua điều kiện đo hoặc lịch sử của lượt chạy. | Tôi dùng bảng Run 2 gồm 3 lượt trên cùng commit làm kết quả chính thức, còn lượt 20/20 chỉ được xem là một lượt hồi quy sau đó. |
| **Tổng hợp validation** | Dùng AI hỗ trợ nhóm các quan sát và quote theo chủ đề UX. | Giúp nhận ra các mẫu lặp như thẻ nguồn khó nhận biết và icon cờ không rõ chức năng. | AI không trực tiếp quan sát người dùng nên có thể diễn giải quá mức lời nói hoặc hành vi. | Tôi giữ log theo đúng những gì đã quan sát, ghi quote nguyên văn và tách rõ vấn đề, quyết định sửa và backlog. |

---

## 3. Bài học sâu sắc nhất từ failure case của nhóm

### GS-11 — citation có thật nhưng sai phần học

Ở Run 1, học viên đang ở phần **“Tạo môi trường và chạy test baseline”** và hỏi *“phần lab này dùng để làm gì?”*. Prototype trả lời bằng nội dung về một lab self-attention khác, kèm citation `T06-160` và `T06-161`.

Nếu chỉ kiểm tự động xem mã nguồn có tồn tại và có nằm trong các đoạn đã tra hay không, câu trả lời này trông có vẻ đáng tin. Tuy nhiên, khi tôi mở nguồn và kiểm tra ngữ cảnh, các đoạn đó không thuộc phần học viên đang hỏi. Đây là lỗi nguy hiểm vì học viên nhìn thấy citation thật nên càng có lý do để tin và làm theo hướng dẫn sai.

Từ case này, tôi đề xuất nhóm không coi tỷ lệ 17/20 của Run 1 là đủ để đạt quality bar. Nhóm bổ sung Critical Gate: GS-10, GS-11 và GS-12 phải đạt 100%, bất kể tỷ lệ tổng là bao nhiêu. Sau khi thêm bảng định tuyến phần học và chạy lại ba lượt trên cùng commit, cả ba case critical đều đạt.

### Bài học rút ra

> *Citation tồn tại không đồng nghĩa với câu trả lời được grounded đúng. Muốn đánh giá một sản phẩm AI an toàn, cần kiểm cả ba lớp: nguồn có thật, nguồn có hỗ trợ điều được khẳng định, và nguồn có thuộc đúng ngữ cảnh người dùng đang hỏi hay không.*

Tôi cũng học được rằng kiểm thử tự động và rà soát của con người không thay thế nhau. Script giúp chạy lặp lại toàn bộ golden set, còn người review cần nhận ra những lỗi ngữ nghĩa mà một điều kiện kỹ thuật đơn giản chưa bao phủ được.

---

## 4. Các câu hỏi tôi sẵn sàng giải trình tại CP6

1. **Vì sao Run 1 đạt 17/20 nhưng nhóm vẫn kết luận chưa đạt?**
   - Vì GS-11 là một case critical: hệ thống dẫn nguồn thật nhưng sai phần học. Tỷ lệ tổng 85% không được phép bù cho lỗi có thể khiến học viên làm nhầm lab.

2. **Kết quả Run 2 chính thức là bao nhiêu?**
   - Ba lượt liên tiếp trên cùng commit `49dacdd` đạt 18/20, 19/20 và 19/20; trung bình **18,67/20, tương đương 93,3%**. Một lượt hồi quy sạch sau đó đạt 20/20, nhưng không được dùng để thay thế kết quả trung bình ba lượt của Run 2.

3. **Tại sao nhóm chọn Conditional automation?**
   - Chi phí của một câu trả lời sai trong học tập khá cao, nhưng học viên cũng cần phản hồi ngay và không thể chờ giảng viên duyệt từng câu. Vì vậy hệ thống chỉ tự trả lời khi có căn cứ trong tài liệu đúng phần học; nếu câu hỏi mơ hồ hoặc thiếu căn cứ thì chuyển sang `clarify` hoặc `not_found`.

4. **Làm sao biết một citation là đúng?**
   - Không chỉ kiểm mã có tồn tại. Tôi kiểm citation có nằm trong tập được phép, đoạn nguồn có hỗ trợ nội dung câu trả lời và đoạn đó có thuộc đúng phần học đang được hỏi hay không.

5. **Nếu có thêm thời gian, tôi sẽ ưu tiên gì?**
   - Hoàn tất chấm đôi với một reviewer độc lập, bổ sung case mới chưa từng dùng để thiết kế `catalog.py`, và đo lại sau các thay đổi UX rút ra từ vòng validation.
