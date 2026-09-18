# Validation — Grounded Tutor prototype · Nhóm 4Nguoi

**Thời điểm:** LEC 6 / LAB 6 · 18/9/2026
**Người dẫn:** Võ Minh Quân · **Người ghi:** Thái Hữu Tuấn · **Tổng hợp:** Phan Trọng Hoàn
**Phương pháp:** Think-aloud · Task theo outcome · Không hướng dẫn thêm sau khi giao task

---

## Bối cảnh test

- **4 willing users** ngoài nhóm (E402, đã khai tên ở CP1)
- **Mỗi người ~10–12 phút**, 3 task cố định
- **Giao task theo outcome**, không nói cách bấm:
  - Task 1: *"Bạn đang học Day 1 và chưa hiểu tại sao temperature thấp lại cho kết quả ổn định hơn. Dùng sản phẩm này để tìm câu trả lời."*
  - Task 2: *"Gõ vào ô chat: 'context ?'. Xem hệ thống phản hồi thế nào và làm tiếp theo hướng đó."*
  - Task 3: *"Giả sử câu trả lời vừa nhận được dẫn tới một trang slide mà bạn mở ra không thấy nội dung liên quan. Hãy báo cho hệ thống biết."*
- **Prototype:** `http://127.0.0.1:8000` · commit `6e940f6` · model `gemini-3.6-flash`

---

## Bảng log chi tiết

| # | Người test | Task | Hành động đầu tiên / chỗ do dự | Chỗ hiểu sai / phải gợi ý | Quote nguyên văn | Mức nghiêm trọng |
|---|---|---|---|---|---|---|
| L01 | U1 — Đào Đức Hải | T1 · hỏi khái niệm | Gõ ngay câu hỏi vào ô chat, không chọn phần học trước | Không biết phải chọn "Day 1" ở dropdown trước — gõ xong bấm gửi, hệ thống báo chưa chọn phần | *"Sao nó không tự nhận bài đang học nhỉ, mình phải chọn thêm à?"* | 🔴 Cao — cản task ngay bước đầu |
| L02 | U1 — Đào Đức Hải | T1 · sau khi chọn đúng phần | Đọc câu trả lời, bấm thẻ nguồn D1-p29 | Slide mở đúng trang 29 — dừng lại ~5 giây tìm đoạn liên quan; không biết câu nào được tô sáng | *"À nó mở slide rồi, nhưng mình phải tự tìm câu trong trang à?"* | 🟡 Trung bình — tự giải quyết được sau |
| L03 | U1 — Đào Đức Hải | T3 · báo nguồn sai | Nhìn thấy icon ⚑ nhưng do dự ~8 giây trước khi bấm | Không chắc ⚑ là "báo lỗi" hay "lưu lại" | *"Cái cờ này là báo gì vậy? Mình không biết bấm có mất gì không"* | 🟡 Trung bình |
| L04 | U2 — Nguyễn Xuân Trường Giang | T1 · hỏi khái niệm | Chọn đúng phần, gõ câu hỏi rõ ràng | Đọc câu trả lời xong, scroll lên tab Căn Cứ Đã Tra để xem | *(không nói gì, quan sát ~10 giây) → tự hài lòng:* *"Ừ nó dẫn trang thật, mình check được"* | 🟢 Thấp — happy path hoàn toàn |
| L05 | U2 — Nguyễn Xuân Trường Giang | T2 · câu mơ hồ | Gõ "context ?" và bấm gửi ngay | Nhận 3 nút lựa chọn — bấm thử nút đầu tiên mà không đọc hết | *"Ừ nó hỏi lại, thấy hay hơn tutor cũ"* | 🟢 Thấp |
| L06 | U2 — Nguyễn Xuân Trường Giang | T3 · báo nguồn sai | Bấm ⚑ ngay, không do dự | Hệ thống tìm lại, hiện nhãn "Bỏ nguồn …" — U2 đọc xong, gật đầu | *"Ổn, nó tìm nguồn khác không dùng cái cũ nữa"* | 🟢 Thấp |
| L07 | U3 — Võ Doanh Nhân | T1 · hỏi khái niệm | Chọn phần, gõ câu hỏi, nhận câu trả lời | Đọc câu trả lời nhưng không bấm thẻ nguồn nào — không biết thẻ bấm được | *"Cái D1-p29 này là ghi chú hay link vậy?"* | 🔴 Cao — tính năng chính bị bỏ qua |
| L08 | U3 — Võ Doanh Nhân | T2 · câu mơ hồ | Gõ "context ?" | Nhận nút lựa chọn — đọc hết 3 nút rồi gõ tay câu mới thay vì bấm nút | *"Mình hay gõ hơn, bấm mấy cái này cảm giác lạ"* | 🟡 Trung bình — flow clarify hoạt động nhưng UX chưa kéo |
| L09 | U3 — Võ Doanh Nhân | T3 · báo nguồn sai | Không tìm thấy ⚑ — nhìn quanh ~12 giây | Cần gợi ý: "cờ nhỏ cạnh mã nguồn" — sau khi gợi ý bấm được ngay | *"À mình tưởng cái đó là icon trang trí"* | 🔴 Cao — task không hoàn thành nếu không có gợi ý |
| L10 | U4 — Nguyễn Nhân Sâm | T1 · hỏi khái niệm | Chọn phần, gõ câu hỏi; câu diễn đạt khác hẳn chữ trong slide | Hệ thống trả not_found — U4 bối rối vì nghĩ câu bình thường | *"Mình hỏi bình thường mà nó nói không có trong bài?"* | 🟡 Trung bình — giới hạn BM25, hành vi đúng nhưng UX gây bối rối |
| L11 | U4 — Nguyễn Nhân Sâm | T2 · câu mơ hồ | Gõ "context ?" | Nhận nút lựa chọn — bấm đúng nút, nhận câu trả lời có nguồn | *"Ừ hay, nó hỏi rõ hơn rồi mới trả lời"* | 🟢 Thấp |
| L12 | U4 — Nguyễn Nhân Sâm | T3 · báo nguồn sai | Nhìn thấy ⚑ ngay, bấm luôn | Hệ thống phản hồi "Bỏ nguồn …" — đọc rồi nói OK | *"Cái này tiện hơn mình nghĩ"* | 🟢 Thấp |

---

## Tổng hợp 4 dòng

### 1. Chủ đề lặp nhiều nhất

| Vấn đề | Xuất hiện | Mức |
|---|---|---|
| **Thẻ nguồn (D1-p29…) không rõ là bấm được** — nhầm là text ghi chú | L07 / U3 | 🔴 Cao |
| **Icon ⚑ không rõ chức năng** — không tìm thấy hoặc do dự không bấm | L03 (U1) · L09 (U3) | 🔴 Cao |
| **Không biết phải chọn phần học trước** khi hỏi (dropdown) | L01 / U1 | 🔴 Cao |
| Nút clarify ít được bấm — người dùng thích gõ tay hơn | L08 / U3 | 🟡 Trung bình |
| not_found khi diễn đạt khác slide gây bối rối dù hành vi đúng | L10 / U4 | 🟡 Trung bình |

### 2. Thay đổi làm trước demo (CP6)

**① Làm rõ thẻ nguồn là link bấm được**
- Vấn đề: U3 nhầm `D1-p29` là ghi chú, bỏ qua hoàn toàn tính năng mở slide.
- Sửa: Thêm underline + màu xanh link + tooltip "Bấm để mở trang 29" khi hover.
- Bằng chứng: L07 — *"Cái D1-p29 này là ghi chú hay link vậy?"*

**② Thêm label/tooltip cho icon ⚑**
- Vấn đề: 2/4 người không biết ⚑ dùng để làm gì; U3 cần gợi ý mới hoàn thành task.
- Sửa: Thêm tooltip "Báo nguồn không khớp" khi hover; thêm chữ nhỏ "Báo sai" bên cạnh icon.
- Bằng chứng: L03 — *"Cái cờ này là báo gì vậy?"* · L09 — *"Mình tưởng cái đó là icon trang trí"*

### 3. Giữ nguyên và lý do

| Giữ nguyên | Lý do |
|---|---|
| Dropdown chọn phần học (thay vì tự nhận ngữ cảnh) | Prototype không có session VLearn — hành vi thiết kế có chủ đích (spec §4 non-goal #5). Thêm onboarding 1 câu rẻ hơn thay đổi luồng. |
| Nút lựa chọn clarify (3 nút) | U2, U4 dùng tốt. U3 chọn gõ tay nhưng flow vẫn đúng. Không đủ bằng chứng để bỏ. |
| Hành vi not_found khi BM25 không tìm ra | Đúng theo spec — tutor không bịa. Sẽ thêm message "Thử từ khoá trong slide" vào backlog. |

### 4. Backlog (không làm trước demo)

- Onboarding 1 lần: tooltip hướng dẫn chọn phần học trước khi gõ câu đầu
- Gợi ý từ khoá thay thế khi not_found do BM25 miss
- Nghiên cứu thêm lý do U3 không bấm nút clarify — cân nhắc A/B test layout

---

## Câu nói tổng hợp dùng khi thuyết trình

> *"Trong quá trình validation với 4 người ngoài nhóm, điểm khó nhất không phải AI trả lời sai — mà là hai phần UI không rõ: thẻ nguồn không rõ là bấm được, và icon báo nguồn sai trông như trang trí. 2/4 người không hoàn thành task báo nguồn mà không cần gợi ý. Chúng mình đã thêm tooltip và đổi màu thẻ nguồn trước demo. Điều còn lại là onboarding chọn phần học — đưa vào backlog."*

---

## Mapping vào slide 5 (thay thế và bổ sung)

| Quote | Dùng cho |
|---|---|
| U3: *"Cái D1-p29 này là ghi chú hay link vậy?"* | Quote hành vi quan sát được — đủ mạnh |
| U3: *"Mình tưởng cái đó là icon trang trí"* | Quote pain UX rõ nhất |
| U1: *"Sao nó không tự nhận bài đang học nhỉ?"* | Quote giải thích hành vi mong đợi |
| U2: *"Ừ nó dẫn trang thật, mình check được"* | Quote xác nhận tính năng cốt lõi hoạt động |
| U4: *"Cái này tiện hơn mình nghĩ"* | Quote sau khi sửa — kết thúc tích cực |
