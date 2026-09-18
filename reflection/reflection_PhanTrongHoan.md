# Bản Tự Nhận Định Cá Nhân (Individual Reflection)

**Mini Hackathon AI — Batch 04 · Lớp 3A**

---

## 👤 Thông tin cá nhân

- **Họ và tên:** Phan Trọng Hoàn
- **Mã học viên:** `2A202602954`
- **Lớp / Phòng / Cụm:** Lớp 3A · Phòng E402 · Cụm C1
- **Dự án:** VLearn Grounded Tutor (Track A — A1: Tối ưu AI tutor hiện có)
- **Vai trò chính:** User Research & Validation Lead

---

## 1. Tôi đã tham gia vào phần nào và đóng góp cụ thể những gì?

Với vai trò **User Research & Validation Lead**, tôi chịu trách nhiệm toàn bộ luồng bằng chứng người dùng — từ thiết kế phương pháp thu thập, phân tích số liệu, cho đến tổ chức validation và ghi lại phản hồi thực tế. Đây là phần làm cho bài toán của nhóm có bằng chứng thực nghiệm, không phải giả định:

| Khối công việc | Tôi đã trực tiếp làm gì? (Hành động & Quyết định) | Kết quả / Tác động tới dự án |
|---|---|---|
| **Thiết kế & triển khai khảo sát Đường A** | Phối hợp soạn bộ 7 câu hỏi Google Form theo chuẩn Mom Test (hỏi về hành vi đã xảy ra, không hỏi ý kiến tương lai); phân phối form tới học viên K4 ngoài nhóm ở cả hai phòng E402/E403; thu 21 phiếu trong 18 phút tối 16/9/2026. | Đạt chuẩn A: n = 21 ≥ 20; tỷ lệ xác nhận 57% ≥ 50%. Bổ sung bằng chứng Đường A cho Đường B (mining chatlog), neo bài toán vào trải nghiệm thật của người dùng. |
| **Phân tích & tổng hợp 21 phiếu khảo sát** | Phân loại từng phiếu theo tiêu chí xác nhận hai lớp (cách đọc chính 12/21 và đọc chặt 6/21); tổng hợp phân bố Q1–Q7; trích 8 câu quote nguyên văn có mã phiếu; đối chiếu với 4 dự đoán đã chốt trước khi xem phiếu. | Phát hiện dự đoán P2 và phần thời gian P3 sai (trung vị thực tế 5–10 phút thay vì 1–5 phút); ghi rõ vào §9 để không che số liệu. Kết quả Q3 thay thế phần chi phí giả thuyết ở §2. |
| **Thử nghiệm ChatGPT study mode (§3)** | Dùng thử tay ~15 phút với một câu hỏi thật của Day 1–2; ghi lại quan sát vào cột ①–③ của bảng §3. | Ghi nhận điểm đáng học (hỏi ngược trước khi trả lời) và điểm đáng né (mặc định không bám tài liệu khoá, không chỉ được trang cụ thể); làm rõ điểm khác biệt của Grounded Tutor. |
| **Chấm đôi 5 output độc lập (§7)** | Đọc độc lập câu hỏi, output và citation từ `eval/results.json` của Run 1; tự xác định hành vi mong đợi trước khi đối chiếu verdict của script; chấm 3 mục (đúng hành vi / có căn cứ / citation đúng ngữ cảnh). | Xác nhận kết quả script trùng với rà soát thủ công ở cả 5 case; phát hiện GS-11 có citation thật nhưng sai lab → bổ sung nhận xét vào phân tích lỗi `eval/run_results.md`. |
| **Làm video demo dự phòng CP5** | Ghi màn hình và lồng tiếng demo 4 đường đi (Happy, Low-confidence, Failure, Correction); kiểm tra âm thanh, cắt ghép và xuất file video trước mốc CP5. | Có sẵn video dự phòng cho tình huống kết nối mạng kém hoặc API hết hạn mức trong khi demo live. |
| **Ghi chép & tổng hợp validation log** | Ghi quan sát think-aloud, hành động đầu tiên, chỗ do dự và quote nguyên văn của 4 willing users; tổng hợp theo bảng log, 4 dòng tóm tắt và mapping vào slide 5 theo format guide. | `validation/feedback-log.md` đủ 12 dòng log, 5 quote có mã người test; 3 vấn đề 🔴 Cao được ghi rõ cùng hành động sửa trước demo. |

---

## 2. Tôi đã dùng AI như thế nào trong quá trình làm việc?

| Giai đoạn | Tôi dùng AI để làm gì? | AI hữu ích ở đâu? | AI sai / hời hợt / có vấn đề ở đâu? | Tôi đã can thiệp & sửa bằng nhận định của mình thế nào? |
|---|---|---|---|---|
| **Thiết kế câu hỏi khảo sát** | Nhờ AI gợi ý bộ câu hỏi khảo sát người dùng ban đầu. | Liệt kê nhanh các chiều đo (hành vi, tần suất, cảm nhận). | AI đề xuất nhiều câu hỏi dạng "bạn có muốn tính năng X không?" — vi phạm nguyên tắc Mom Test, dễ dẫn đến confirmation bias. | Loại bỏ toàn bộ câu hỏi hỏi về tương lai; viết lại theo chuẩn "kể cho tôi nghe lần gần nhất bạn…" để neo câu trả lời vào hành vi đã xảy ra. |
| **Phân tích số liệu khảo sát** | Nhờ AI tính khoảng tin cậy Wilson 95% cho các tỷ lệ. | Tính nhanh KTC 95% Wilson: 57% → (37–76%), không cần công thức thủ công. | AI ban đầu trả về KTC theo công thức Wald đơn giản (sai với n nhỏ). | Yêu cầu AI dùng đúng công thức Wilson Score Interval và đối chiếu bằng tay với bảng tham chiếu; ghi rõ cả hai con số xác nhận (57% và 29%) trong spec. |
| **Tổng hợp validation log** | Nhờ AI gợi ý format bảng log theo chuẩn guide cuộc thi. | Đề xuất cấu trúc bảng có cột mức nghiêm trọng, hành động đầu tiên, chỗ hiểu sai — tiết kiệm thời gian soạn template. | AI gợi ý các quote "nguyên văn" theo kiểu suy diễn chung chung, thiếu chi tiết hành vi cụ thể. | Thay toàn bộ bằng quote ghi từ buổi test thực tế; giữ đúng lời học viên nói, kể cả câu ngắn hay thiếu văn phong. |
| **Soạn thảo câu nói tổng hợp khi thuyết trình** | Nhờ AI viết câu mở đầu phần validation. | Tạo khung câu mạch lạc, đủ 3 phần (bối cảnh → vấn đề → thay đổi). | Câu AI viết dùng chữ "người dùng rất thích" và "mọi người đều hài lòng" — không có bằng chứng, vi phạm quy tắc cuộc thi. | Xóa các cụm cảm tính; thay bằng số hành vi đo được ("2/4 người không hoàn thành task mà không cần gợi ý") và hành động cụ thể đã sửa. |

---

## 3. Bài học sâu sắc nhất từ quá trình làm User Research

### Tình huống: **Dự đoán P2 sai — "Không kiểm tra, vẫn học tiếp" không xảy ra**

Trước khi tổng hợp phiếu, nhóm dự đoán P2: ≥ 30% người chọn "Không kiểm tra hoặc không chắc nhưng vẫn học tiếp" ở câu Q3 — vì 92% câu trả lời không nguồn trong log dài ≥ 300 ký tự, giọng khẳng định, có vẻ dễ khiến người đọc tin luôn.

**Kết quả thực tế:** 0/21 người chọn mức đó.

**Tại sao sai:** Sau khi đọc kỹ phiếu, tôi nhận ra Q3 hỏi "bạn mất bao lâu để yên tâm học tiếp" — không phải "bạn có kiểm tra không". Cả 6 người trả lời Q1 = "Không" (không kiểm tra) vẫn chọn một mức thời gian ở Q3, tức họ hiểu Q3 là thời gian để họ tự cảm thấy ổn, không phải thời gian bỏ ra kiểm tra.

**Bài học:**

> *"Câu hỏi khảo sát có thể bị hiểu theo nhiều cách khác với ý đồ người thiết kế. Ngay cả khi đã đọc kỹ trước khi gửi, vẫn cần thử nghiệm trên 1–2 người trước để phát hiện ambiguity. Số liệu không bao giờ tự nói — người phân tích phải hiểu đúng ngữ cảnh thu thập mới đọc được đúng ý nghĩa."*

---

## 4. Tự tin trả lời các câu hỏi phản biện tại vòng Thuyết trình (CP6)

1. **Tại sao chỉ có 21 phiếu? Mẫu có đại diện không?**
   - *Trả lời:* 21 phiếu đủ đạt chuẩn A (n ≥ 20 và tỷ lệ xác nhận ≥ 50%). Phiếu được thu từ học viên K4 ngoài nhóm, hỏi về hành vi đã xảy ra — không phải dự đoán tương lai. Giới hạn đã được ghi rõ: form không có câu sàng lọc phòng, và khoảng tin cậy rộng (37–76%) nên Đường A được dùng làm bằng chứng bổ trợ cho Đường B (mining chatlog), không thay thế.

2. **Sao không có validation với prototype trực tiếp từ trước?**
   - *Trả lời:* Khảo sát Đường A thu thập bằng chứng pain point trước khi prototype hoàn thiện — đây là bước validation bài toán, không phải validation sản phẩm. Validation với prototype (4 willing users) được tổ chức ở LEC 6/LAB 6 khi prototype đã chạy end-to-end. Hai vòng phục vụ hai mục đích khác nhau.

3. **Kết quả validation có quote "người dùng thích" không? Có đủ tin không?**
   - *Trả lời:* Không có câu nào kiểu "rất thích" hay "hài lòng". Log chỉ ghi hành vi quan sát được (U3 không bấm thẻ nguồn vì nhầm là text; U3 không tìm thấy ⚑ trong 12 giây) và quote nguyên văn lời nói. Hành vi quan sát được mạnh hơn lời khen — và hành vi đó dẫn đến 2 thay đổi cụ thể trước demo.
