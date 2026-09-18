# Bản Tự Nhận Định Cá Nhân (Individual Reflection)

**Mini Hackathon AI — Batch 04 · Lớp 3A**

---

## 👤 Thông tin cá nhân

- **Họ và tên:** Võ Minh Quân
- **Mã học viên:** `2A202602429`
- **Lớp / Phòng / Cụm:** Lớp 3A · Phòng E402 · Cụm C1
- **Dự án:** VLearn Grounded Tutor (Track A — A1: Tối ưu AI tutor hiện có)
- **Vai trò chính:** Fullstack & Evaluation Lead

---

## 1. Tôi đã tham gia vào phần nào và đóng góp cụ thể những gì?

Với vai trò là **Fullstack & Evaluation Lead**, tôi phụ trách toàn bộ hệ thống giao diện tương tác người dùng (Frontend Web App), bộ công cụ đo lường thực nghiệm tự động (Evaluation Framework), và các tính năng đột phá về thị giác (Smart Visual Pinning, Exact Quote Line Highlighting & Vibrant Amber Spotlight):

| Khối công việc | Tôi đã trực tiếp làm gì? (Hành động & Quyết định kỹ thuật) | Kết quả / Tác động tới dự án |
|---|---|---|
| **Bộ công cụ đo lường tự động (`eval/run_eval.py`)** | Xây dựng pipeline kiểm thử tự động toàn bộ 20 ca Golden Set qua đúng quy trình thật (BM25 retrieval → LLM invocation → citation validator → status checker); tự động xuất báo cáo JSON theo timestamp tại `eval/runs/`, cập nhật `eval/results.json` và đồng bộ bảng Markdown `eval/run_results.md`. | Đo lường chính xác tiến độ sản phẩm từ Run 1 (17/20 - 85%) đến Run 2 (trung bình 93,3% và lượt đạt 20/20 - 100%), giúp nhóm có con số thực nghiệm chuẩn xác phục vụ nộp CP3 và bảo vệ tại CP4/CP6. |
| **Tính năng đột phá: Smart Visual Pinning (`app.js`)** | Thiết kế lớp Canvas overlay trên slide PDF; bắt các sự kiện chuột (`mousedown`, `mousemove`, `mouseup`) vẽ khung khoanh vùng; tận dụng ma trận biến đổi toạ độ (`transform`) của PDF.js text layer để trích xuất 0ms các từ ngữ nằm trong bounding box; hiển thị Hộp đèn Spotlight (`#pin-spotlight-box`) viền sáng và Thẻ Ghim Thông Minh (`#smart-pin-card`) tại toạ độ chọn. | Biến file PDF tĩnh thành Canvas tương tác thông minh; giải quyết triệt để nỗi đau câu hỏi cụt mơ hồ ("ở đây", "chỗ này") bằng cách đưa trực tiếp toạ độ và nội dung vào context của AI; giảm 100% tải nhận thức mô tả vị trí của học viên. |
| **Tô sáng dòng nguyên văn trên Slide (`highlightQuoteOnSlide`)** | Phát triển thuật toán gom cụm mật độ dọc (vertical density clustering) đối chiếu câu trích dẫn của AI với `currentTextItems` của PDF.js; bọc khung canvas tỷ lệ 1:1 trong `#slide-canvas-wrapper`; chiếu khung chữ nhật phát sáng viền vàng hổ phách (`#quote-line-highlight`) kèm nhãn nổi `✨ Đoạn AI lấy làm căn cứ`. | Rút ngắn thời gian xác thực tài liệu từ việc "mở đúng trang" xuống "chỉ thẳng vào đúng dòng chữ", loại bỏ hoàn toàn tình trạng học viên phải dò đọc lại cả trang slide dài. |
| **Hệ thống Tiêu Điểm Vàng Hổ Phách trên Transcript (Vibrant Spotlight)** | Xóa bỏ hiệu ứng nhấp nháy viền xám đen mờ nhạt cũ; thay bằng thẻ tiêu điểm `.transcript-active-card` với dải chỉ báo bên trái dày 6px màu hổ phách đậm, nền dải màu gradient vàng kem, hiệu ứng phát quang đa tầng `pulseAmberGlow`; tự động bọc câu trích dẫn bằng thẻ `<mark>` viền đậm (`ring-2 ring-amber-500`) và gắn badge định vị; hỗ trợ tương tác click-to-highlight trực tiếp trên transcript. | Định vị thị giác lập tức vào đúng câu văn bản chép lời mà AI đã dùng làm căn cứ; duy trì trạng thái tiêu điểm bền vững giúp học viên không bị mất dấu khi cuộn đọc nội dung dài. |
| **Giao diện So Sánh Đối Chiếu & Golden Set (`index.html`, `app.js`)** | Xây dựng tab So Sánh Đối Chiếu theo phong cách Taxonomy/shadcn (nền `#fafafa`, font Geist Sans/Mono); bố cục 2 cột đặt cạnh nhau giữa câu trả lời cũ của tutor (lấy từ log K4) và câu trả lời mới của AI Grounded Tutor; tích hợp bộ chọn 20 ca Golden Set và nút *"Thử với AI thật"* để giám khảo test trực tiếp. | Giúp người xem và ban giám khảo nhìn thấy ngay lập tức sự khác biệt "trước và sau" (từ chém gió không nguồn sang trả lời có căn cứ trích dẫn rõ ràng). |
| **Refactor Typography & Nút bấm To Rõ ("To lên / Tô lên")** | Rà soát toàn bộ hệ thống giao diện; tăng cỡ chữ nội dung chat, câu hỏi và input từ 11–12px lên **14px (`text-sm`)** với khoảng cách dòng thoáng đãng (`leading-relaxed`); phóng to tiêu đề lên **16–18px (`text-base / text-lg font-bold`)**; mở rộng touch target của các nút bấm nổi (chat toggle 56px, nút điều hướng slide 56px, badge trạng thái). | Nâng cao vượt bậc độ sắc nét và khả năng đọc khi thuyết trình trên máy chiếu phòng E402 cũng như khi học viên thao tác trên laptop cá nhân. |

**Dấu tay kỹ thuật rõ nhất của tôi trong Repo:**
- Toàn bộ module tương tác Smart Visual Pinning và thuật toán gom cụm toạ độ `highlightQuoteOnSlide` trong `codebase/app.js`.
- Cấu trúc DOM và hệ thống style Spotlight, Amber Glow, responsive canvas wrapper trong `codebase/index.html`.
- Script chạy và ghi nhận đánh giá tự động `eval/run_eval.py`.
- Thiết kế giao diện Tab So Sánh Đối Chiếu kết nối trực tiếp với file kết quả `eval/results.json`.

---

## 2. Tôi đã dùng AI như thế nào trong quá trình làm việc?

| Giai đoạn | Tôi dùng AI để làm gì? | AI hữu ích ở đâu? | AI sai / hời hợt / có vấn đề ở đâu? | Tôi đã can thiệp & sửa bằng nhận định của mình thế nào? |
|---|---|---|---|---|
| **Xây dựng Runner tự động (`run_eval.py`)** | Nhờ AI sinh boilerplate script đọc JSON, gửi request HTTP tới server và ghi file log. | Viết nhanh cấu trúc runner và xử lý tính toán độ trễ (latency), tiết kiệm thời gian gõ code lặp lại. | AI viết logic chấm điểm quá lỏng: chỉ kiểm tra HTTP status 200 chứ không bóc tách kiểm tra citation hợp lệ hay phân loại 4 lớp chỗ khó. | Thiết kế lại toàn bộ ma trận chấm 5 tiêu chí độc lập (status, valid citations, must_not_cite, injection flag, ungrounded rejection). |
| **Xử lý toạ độ PDF.js Canvas** | Tham khảo AI cách chuyển đổi toạ độ viewport PDF.js sang toạ độ CSS tương đối của HTML canvas. | Cung cấp công thức ma trận biến đổi affine cơ bản của PDF.js (`transform[4]`, `transform[5]`). | Code AI sinh tính toạ độ dựa trên kích thước khung cha `#slide-frame` thay vì bọc sát thẻ `<canvas>`, dẫn đến việc box highlight bị lệch toạ độ nghiêm trọng khi cửa sổ co giãn. | Bọc `<canvas>` và `#slide-overlay` trong một wrapper chung `#slide-canvas-wrapper` với `relative inline-block leading-none`; chuẩn hóa toạ độ theo tỷ lệ % mặt chữ. |
| **Thuật toán Highlight câu trích trên Slide** | Nhờ AI viết thuật toán tìm vị trí từ khoá câu trích trong danh sách `textItems`. | Gợi ý ý tưởng so khớp từ ngữ sau khi chuẩn hóa chữ thường và bỏ dấu câu. | AI tìm kiếm đơn giản bằng cách lấy bounding box bao trọn TẤT CẢ các từ khớp trên toàn trang (ví dụ từ "temperature" xuất hiện ở cả tiêu đề và chân trang làm box bị kéo dãn bao trọn cả slide). | Phát triển thuật toán gom cụm theo chiều dọc (Vertical Density Clustering với ngưỡng delta Y < 0.10) để chỉ khoanh vùng đúng cụm câu tập trung nhất. |
| **Hiệu ứng định vị Transcript** | Nhờ AI gợi ý hiệu ứng CSS để làm nổi bật đoạn văn bản được chọn. | Đề xuất các lớp màu nền và animation nhấp nháy cơ bản. | AI đề xuất animation viền đen xám nhạt (`rgba(9, 9, 11)`) nhấp nháy 3 nhịp rồi tắt ngấm, câu chữ bên trong không được tô màu, mắt người đọc không định vị được. | Thay thế hoàn toàn bằng hệ thống Amber Glow đa tầng (`pulseAmberGlow`), dải chỉ báo bên trái 6px, duy trì trạng thái tiêu điểm bền vững và bọc câu trích bằng thẻ `<mark>` vàng đậm có ring viền. |

---

## 3. Bài học sâu sắc nhất từ ca thất bại (Failure Case) của nhóm

### Tình huống kỹ thuật: **"Hộp highlight bị dãn bao trọn cả trang slide" và "Đoạn văn bản trích dẫn bị mất hút"**

- **Hiện tượng:** 
  Khi triển khai tính năng tô sáng câu trích dẫn của AI lên trang slide, trong các lần thử đầu tiên với câu hỏi *"Temperature là gì?"* (trang 29), thay vì khoanh vào đúng dòng giải thích về Temperature, khung highlight màu vàng lại bị kéo dãn to đùng, bao trùm gần như toàn bộ trang slide từ tiêu đề trên cùng xuống tận chân trang! Đồng thời, khi chuyển sang tab Transcript, hộp thoại chỉ chớp nhẹ viền xám đen mờ nhạt rồi trở lại bình thường, người dùng hoàn toàn không biết AI đã lấy câu chữ nào ở đâu.
- **Phân tích nguyên nhân kỹ thuật gốc rễ:**
  1. **Trên Slide:** Thuật toán ban đầu do AI gợi ý chỉ đơn thuần duyệt qua tất cả các từ trong câu trích (ví dụ: *"temperature"*, *"mô hình"*, *"xác suất"*), tìm các phần tử text trên slide có chứa những từ đó rồi lấy toạ độ cực tiểu `min(X, Y)` và cực đại `max(X, Y)` của tất cả các từ tìm được. Vì từ *"Temperature"* xuất hiện ở tiêu đề trang 29 (đầu trang) và xuất hiện lần nữa ở ghi chú tham số (cuối trang), việc lấy `min/max` toàn cục đã vô tình biến khung highlight thành một hình chữ nhật khổng lồ che hết cả slide.
  2. **Lệch toạ độ Canvas:** Thẻ `#slide-overlay` được đặt `absolute inset-0` bên trong `#slide-frame` (khung flex căn giữa màn hình) thay vì bọc sát chiếc `<canvas>` PDF. Khi cửa sổ co giãn hoặc tỷ lệ khung hình thay đổi, toạ độ % bị lệch hẳn so với mặt chữ thực tế.
  3. **Trên Transcript:** Hệ thống cũ chỉ gọi hàm `flash(el)` thêm class viền đen mờ 1.2s rồi biến mất, hoàn toàn thiếu logic phân tích câu để bôi màu highlight (`<mark>`) vào nội dung bên trong.
- **Hành động khắc phục:**
  1. Tôi đã viết lại thuật toán **Vertical Density Clustering (`highlightQuoteOnSlide`)**: gom các từ tìm được thành các cụm (cluster) có khoảng cách toạ độ Y gần nhau (`Math.abs(item.ny - avgY) < 0.10`), sau đó chọn cụm có độ phủ từ khoá cao nhất để vẽ bounding box. Khung highlight ngay lập tức ôm khít lấy đúng 1-2 dòng văn bản trọng tâm.
  2. Tạo `#slide-canvas-wrapper` với `relative inline-block leading-none` bọc khít cả `<canvas>` và `#slide-overlay`, bảo đảm độ chính xác toạ độ 100% ở mọi độ phân giải.
  3. Xây dựng hàm `highlightQuoteInTranscript`: bóc tách đoạn văn bản thành từng câu, chấm điểm trùng khớp với câu trích của AI, và bọc trực tiếp bằng thẻ `<mark class="bg-amber-300 text-amber-950 font-bold ring-2 ring-amber-500">` kèm huy hiệu nổi bật.

### 💡 Bài học rút ra:
> *"Một ý tưởng AI hay (trích dẫn nguyên văn) sẽ hoàn toàn mất đi giá trị nếu tầng hiển thị (Visual Presentation) cẩu thả hoặc thiếu chính xác. Trong thiết kế sản phẩm AI tương tác, khoảng cách giữa 'biết câu trả lời nằm ở trang nào' và 'mắt học viên bắt trúng ngay câu chữ cốt lõi' chính là ranh giới giữa một bản demo thô sơ và một sản phẩm hoàn thiện đạt độ tin cậy cao."*

---

## 4. Tự tin trả lời các câu hỏi phản biện tại vòng Thuyết trình (CP6)

1. **Smart Visual Pinning khác gì so với việc học viên tự bôi đen văn bản thông thường?**
   - *Trả lời:* Tài liệu bài giảng trên LMS phần lớn là slide trình chiếu dạng PDF/Canvas tĩnh hoặc hình ảnh sơ đồ, học viên không thể dùng chuột bôi đen text theo cách truyền thống (mined data K4 cho thấy 0/3.097 lượt có thao tác bôi đen). Smart Visual Pinning giải quyết triệt để rào cản này bằng cách cho phép kéo chuột khoanh vùng toạ độ tự do (lasso selection) trên lớp overlay, kết hợp trích xuất hình học của PDF.js để lấy text tự động trong 0ms và chiếu Spotlight viền sáng, giúp học viên hỏi ngay mà không tốn công mô tả vị trí.

2. **Tại sao lại cần cơ chế kiểm chứng câu trích bằng code (0ms) thay vì để AI tự kiểm tra?**
   - *Trả lời:* Việc dùng LLM để tự chấm lại câu trả lời của chính nó (LLM-as-a-judge) vừa làm tăng độ trễ thêm 2–4 giây, vừa tốn chi phí token và vẫn có nguy cơ bị hallucination vòng tròn. Chúng tôi xây dựng hàm `verify_exact_quotes` bằng code Python thuần túy: chuẩn hóa chuỗi và so khớp n-gram trực tiếp với văn bản tài liệu gốc. Cơ chế này tiêu tốn **0 token, 0 ms độ trễ**, mang tính tất định 100% và bảo đảm không có bất kỳ trích dẫn bịa nào đến được mắt học viên.

3. **Giao diện So Sánh Đối Chiếu được thiết kế nhằm mục đích gì trong thực tế?**
   - *Trả lời:* Tab So Sánh Đối Chiếu giải quyết bài toán "niềm tin" (Trust & Transparency). Nó cho phép học viên, giảng viên và ban giám khảo đặt câu trả lời cũ của tutor (thường dài dòng, khẳng định nhưng không có nguồn) cạnh câu trả lời mới của AI Grounded Tutor (ngắn gọn, có căn cứ rõ ràng kèm thẻ mở đúng trang). Đồng thời, nút "Thử với AI thật" cho phép chạy trực tiếp trên hệ thống tại thời gian thực để chứng minh năng lực thực tế chứ không chỉ là giao diện tĩnh.

4. **Tại sao nhóm quyết định nâng cấp kích thước chữ và nút bấm to rõ toàn diện?**
   - *Trả lời:* Dựa trên bài học từ các buổi trình bày kỹ thuật và quy chuẩn trải nghiệm người dùng (UX): trong môi trường lớp học và thuyết trình, màn hình thường được chiếu qua projector hoặc chia sẻ qua màn hình máy tính từ xa. Cỡ chữ nhỏ (11–12px) khiến người nghe bị mỏi mắt và phân tâm. Việc chuẩn hóa typography lên 14px (nội dung) và 16–18px (tiêu đề) cùng các nút bấm touch target 56px giúp giao diện nổi bật, rõ ràng và truyền tải thông tin mạch lạc nhất.

