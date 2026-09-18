# Bản Tự Nhận Định Cá Nhân (Individual Reflection)

**Mini Hackathon AI — Batch 04 · Lớp 3A**

---

## 👤 Thông tin cá nhân

- **Họ và tên:** Đàm Quang Trung
- **Mã học viên:** `2A202602525`
- **Lớp / Phòng / Cụm:** Lớp 3A · Phòng E402 · Cụm C1
- **Dự án:** VLearn Grounded Tutor (Track A — A1: Tối ưu AI tutor hiện có)
- **Vai trò chính:** Leader & AI / Backend Engineer

---

## 1. Tôi đã tham gia vào phần nào và đóng góp cụ thể những gì?

Với vai trò là **Leader** kiêm phụ trách **AI / Backend**, tôi tham gia trực tiếp vào việc định hình bài toán, xây dựng tài liệu Spec, thiết kế kiến trúc kỹ thuật và giải quyết các lỗi hỏng then chốt của Agent:

| Khối công việc | Tôi đã trực tiếp làm gì? (Hành động & Quyết định kỹ thuật) | Kết quả / Tác động tới dự án |
|---|---|---|
| **Điều phối nhóm & Quản lý tiến độ** | Điều phối 4 thành viên theo sát lịch nộp CP1 → CP5; chia việc theo thế mạnh (Spec/Mining, Frontend/UI, Evaluation, User Research); rà soát chéo chất lượng deliverable trước mỗi checkpoint. | Nhóm nộp đúng hạn 100% các mốc CP1–CP5; không bị dồn việc vào phút chót; bảo đảm tính nhất quán giữa Spec, Code và Slide. |
| **Spec §1–§2 (Bằng chứng & Impact)** | Khai phá (mining) tập dữ liệu 3.097 lượt chatlog K4 bằng script và kiểm chứng thủ công; xác định chính xác tỷ lệ 11% câu hỏi nội dung thiếu trích dẫn (≈310 lượt/tuần); xây dựng bảng tính Impact cho 3 ứng viên và bảo vệ quyết định chọn Ứng viên A. | Cung cấp bằng chứng thực nghiệm đạt chuẩn B vững chắc cho Spec; bài toán được neo chặt vào số liệu đo lường thực tế, không bịa đặt. |
| **Spec §4–§6 (Thiết kế, Lỗi & 4 Đường đi)** | Viết lát cắt chuẩn 1 câu; xác lập danh sách non-goals; phân loại taxonomy 4 lớp chỗ khó (① Nguồn sự thật, ② Mơ hồ, ③ Ngoài phạm vi, ④ Đặc thù domain); xây dựng 13 kịch bản lỗi và 4 đường đi trải nghiệm (Happy, Low-confidence, Failure, Correction). | Spec đạt chuẩn cấu trúc 8 phần theo đúng rubric chấm điểm của khoá; định hình rõ ranh giới xử lý của hệ thống. |
| **Backend & Retrieval Pipeline (`codebase/tutor/`)** | Xây dựng pipeline tra cứu BM25 thuần Python (chuẩn hóa tiếng Việt, tách âm tiết, n-gram cặp âm tiết, loại bỏ dấu); viết cơ chế lọc phân đoạn theo bài học (`in_scope` vs `out_scope`). | Tốc độ tra cứu dưới 50ms, không phụ thuộc thư viện bên ngoài nặng nề, bảo đảm prototype chạy độc lập trên mọi máy. |
| **Kiểm định nguồn & An toàn (`agent.py`)** | Xây dựng thuật toán `check_citations` loại bỏ triệt để mã nguồn ảo giác (`ungrounded`); thiết lập bộ lọc Regex `check_injection` chặn đứng các câu hỏi tấn công prompt injection ngay trước khi gọi LLM. | Đạt tiêu chí Quality Bar ② (0 mã nguồn bịa đến tay học viên) và ③ (100% prompt injection bị chặn cố định). |
| **Multi-LLM Integration (`llm.py`)** | Thiết kế module gọi LLM đa tầng có cơ chế fallback tự động: `gpt-4.1-mini` → `gpt-4o-mini` → `deepseek-v4.1` → `deepseek-v4-flash` → chuỗi model `gemini` khi gặp lỗi 429 hoặc cạn quota. | Đảm bảo hệ thống demo hoạt động bền bỉ, không bao giờ bị gián đoạn hay crash giữa chừng vì sự cố API ngoài ý muốn. |
| **Xử lý hồi quy Run 2 (`catalog.py` & Retrieval)** | Phát hiện nguyên nhân GS-20 bị trượt top retriever do tên phần lấn át câu hỏi; sửa cơ chế tra cứu thành xen kẽ query và kết hợp bảng định tuyến xác định `catalog.py`. | Nâng tỷ lệ đạt từ 85% (Run 1) lên trung bình **93,3% (18,67/20)** ở Run 2 qua 3 lượt liên tiếp cùng commit `49dacdd`. |

**Dấu tay kỹ thuật rõ nhất của tôi trong Repo:**
- Thuật toán kiểm duyệt citation hai vòng (`check_citations` loại bỏ hallucinated IDs và hạ cấp câu trả lời không nguồn; `cited_from_quote` xác thực trích dẫn nguyên văn).
- Hệ thống Fallback Multi-Provider trong `codebase/tutor/llm.py` tích hợp cả OpenAI, DeepSeek và Gemini.

---

## 2. Tôi đã dùng AI như thế nào trong quá trình làm việc?

| Giai đoạn | Tôi dùng AI để làm gì? | AI hữu ích ở đâu? | AI sai / hời hợt / có vấn đề ở đâu? | Tôi đã can thiệp & sửa bằng nhận định của mình thế nào? |
|---|---|---|---|---|
| **Data Mining & Phân tích log** | Nhờ AI viết script lọc regex tìm các mẫu câu hỏi mơ hồ ("ở đây", "phần này") trong file CSV 13.494 dòng. | Tốc độ viết regex và pandas script nhanh, tiết kiệm thời gian xử lý dữ liệu thô. | Script AI đếm từ khoá bị thổi phồng con số (bắt nhầm các câu hỏi có ngữ cảnh rõ ràng nhưng vô tình chứa từ khoá). | Kiểm tra thủ công 40 mẫu ngẫu nhiên, phát hiện chỉ 18/40 là đúng loại; điều chỉnh lại công thức ước lượng về con số trung thực ≈11% (≈310 lượt). |
| **Xây dựng Prompt cho Agent** | Nhờ AI soạn thảo system prompt ban đầu hướng dẫn model trích dẫn nguồn. | Tạo khung prompt nhanh với văn phong sư phạm chuẩn mực. | Model có xu hướng nói dài dòng, tự suy diễn kiến thức bên ngoài khi slide thiếu, và tự bịa mã nguồn `[D1-p99]` để "cho có nguồn". | Viết lại prompt với các quy tắc răn đe nghiêm ngặt (Quy tắc 1-4); bổ sung nguyên tắc "không có căn cứ thì nói rõ `not_found`, cấm đoán mò". |
| **Bộ lọc Prompt Injection** | Dùng AI sinh regex nhận diện các mẫu prompt injection phổ biến. | Liệt kê nhanh các từ khoá tấn công (ignore previous instructions, system prompt,...). | Regex AI sinh bắt luôn cả câu hỏi hợp lệ của học viên tại Part 2 (ví dụ: *"system prompt là gì"* trong bài học về token và chi phí). | Tinh chỉnh regex chỉ kiểm tra trên nội dung câu hỏi người dùng, không quét tên phần học; loại bỏ false-positive cho các thuật ngữ học thuật. |
| **Tối ưu Retrieval & Catalog** | Thảo luận với AI cách xử lý các ca trỏ vào lab không có trong tài liệu. | Gợi ý dùng deterministic routing thay vì cố nhồi toàn bộ tài liệu vào context. | AI đề xuất đưa toàn bộ code của các buổi khác vào context, gây tốn token và tăng nguy cơ trích dẫn nhầm lab. | Quyết định áp dụng bảng ánh xạ `catalog.py` bằng code cứng; nếu phần học không có tài liệu thì chặn ngay ở tầng luật, trả về hướng dẫn tìm TA. |

---

## 3. Bài học sâu sắc nhất từ ca thất bại (Failure Case) của nhóm

### Ca thất bại điển hình: **GS-11 · Câu hỏi về "Tạo môi trường và chạy test baseline"**
- **Hiện tượng:** Ở Run 1, học viên hỏi cách cấu hình môi trường cho phần lab hiện tại. Prototype trả về câu trả lời mạch lạc kèm citation `[T06-160]`, `[T06-161]`. Hệ thống chấm tự động lúc đầu đánh giá **Đạt** vì các citation này có thật trong tập retrieved chunks và khớp với nội dung sinh ra.
- **Phát hiện rủi ro nguy hiểm:** Khi bạn Thái Hữu Tuấn tiến hành rà soát thủ công độc lập từng case, Tuấn phát hiện đoạn transcript `T06-160` thuộc về một bài lab Self-Attention của buổi khác, hoàn toàn không phải phần học viên đang hỏi!
- **Hậu quả nếu đưa ra thực tế:** Đây là lỗi **nguy hiểm nhất** (Failure loại ④) — học viên sẽ tin tưởng làm theo hướng dẫn của AI và cấu hình sai toàn bộ môi trường thực hành, gây lãng phí hàng giờ sửa lỗi mà không hiểu tại sao.
- **Hành động khắc phục của nhóm:**
  1. Chúng tôi lập tức công nhận Run 1 **chưa đạt Quality Bar** (dù tổng điểm đạt 17/20 = 85%) và bổ sung **Điều kiện 4 (Critical Gate)**: Bắt buộc 100% các ca GS-10, GS-11, GS-12 phải đạt.
  2. Về kỹ thuật: Tôi phối hợp cùng Quân xây dựng bảng định tuyến `catalog.py`. Khi học viên hỏi về thao tác lab mà phần học đó không có tài liệu hướng dẫn trong data pack, hệ thống chặn ngay bằng luật, trả về trạng thái `not_found` với thông báo rõ ràng *"Tài liệu khoá học chưa cung cấp hướng dẫn cho phần lab này, bạn hãy xem tài liệu trên repo hoặc hỏi TA"* thay vì để AI cố tìm kiếm và "mượn" citation từ lab khác.

### 💡 Bài học rút ra:
> *"Một tỷ lệ chính xác cao (85% hay 90%) hoàn toàn có thể che giấu những lỗi sai tai hại nếu chỉ nhìn vào con số tổng quát. Trong các sản phẩm ứng dụng AI, việc kiểm thử tự động chỉ là điều kiện cần; sự can thiệp rà soát của con người đối với các trường hợp biên nguy hiểm (critical boundary cases) là điều kiện đủ để bảo vệ người dùng."*

---

## 4. Tự tin trả lời các câu hỏi phản biện tại vòng Thuyết trình (CP6)

1. **Tại sao chọn Augment (Hỗ trợ) thay vì Automate (Tự động hoá)?**
   - *Trả lời:* Chi phí của việc sai (cost-of-error) trong học tập rất cao: học viên hiểu sai khái niệm sẽ làm sai lab và trả lời sai quiz. Việc tự động hoá hoàn toàn câu trả lời khi chưa đủ 100% căn cứ là cực kỳ nguy hiểm. Do đó nhóm chọn **Augment**: AI chỉ tóm tắt và chỉ điểm vị trí (trang slide/đoạn transcript), còn quyết định tiếp nhận thông tin và kiểm chứng thuộc về học viên thông qua việc mở thẻ nguồn hoặc tương tác trực quan (Smart Visual Pinning).
2. **Quyết định AI trung tâm của hệ thống là gì?**
   - *Trả lời:* Quyết định phân loại hành vi: Hệ thống có đủ căn cứ đáng tin cậy trong tài liệu bài học để trả lời hay không? Nếu đủ căn cứ → `answer` kèm trích dẫn nguyên văn; nếu mơ hồ → `clarify` hỏi lại; nếu thiếu tài liệu → `not_found` từ chối kèm gợi ý nơi tìm kiếm.
3. **Nếu có thêm thời gian, bạn sẽ cải tiến điều gì tiếp theo?**
   - *Trả lời:* Tôi sẽ xây dựng thêm bộ nhớ phiên chat (multi-turn context memory) để giải quyết dứt điểm ca hỏng duy nhất còn lại ở Run 2 là **GS-05** (câu hỏi *"chi tiết hơn"* bị mất đối tượng khi gửi truy vấn độc lập).
