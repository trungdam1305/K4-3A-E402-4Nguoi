# Template AI Spec *(spec.md — commit trước hạn chốt spec: 21:00 17/9, tại CP4 · quality bar chốt từ thời điểm nộp)*

> Cấu trúc phủ đúng "SPEC 8 phần" của chương trình: Bằng chứng (§1-§2) · Lát cắt (§4) · Canvas (đính kèm CP1) · Augment/Automate (§4) · 4 đường đi của trải nghiệm (§6) · Kiểu lỗi (§5) · Kiểm thử (§7) · Phân công (§8). Hướng dẫn viết từng mục: `02-guide.md`.

# AI SPEC — [Tên lát cắt] · Nhóm [4Nguoi] · Zone [C1]
Hướng: [x] A — VLearn  [ ] B — Trợ lý Học viên  [ ] C — Làn mở
Loại: [x] Tối ưu tính năng có sẵn  [ ] Tính năng mới

## §1. User & Job

**Tiêu đề:** Học viên hỏi tutor nhưng không kiểm được câu trả lời có đúng bài giảng không

### Job executor + workflow

**Job executor:** học viên K4 đang học tài liệu của một buổi trên VLearn (slide, video, hướng dẫn lab), trong giờ học hoặc khi tự học lại sau buổi, và dừng lại ở một chỗ chưa hiểu. Log K4 (09/09–15/09/2026) có **448 học viên** với **3.097 lượt hỏi** tutor.

| # | Bước | Học viên làm gì | Dấu vết trong log |
|---|---|---|---|
| 1 | Mở phần học | Vào slide / video / hướng dẫn lab của buổi | Câu hỏi K4 mang tiền tố `(Đang học phần "…" của buổi này)` |
| 2 | Gặp chỗ chưa hiểu | Một khái niệm, một bước trong đề lab, một câu quiz ôn tập | 2.817 lượt là câu hỏi nội dung |
| 3 | Hỏi ngay trong trang | Gõ câu hỏi, không rời tài liệu | 2.278/2.817 là câu tự gõ, không phải câu mẫu bấm sẵn |
| 4 | **Nhận lời giải thích** | Đọc câu trả lời | 725/2.817 lượt không trích dẫn trang; phần lớn cũng không nói là đang trả lời ngoài tài liệu (xem Evidence) |
| 5 | **Quyết định: tin hay kiểm lại** | Tin luôn, hoặc tự lật slide / xem lại video, hỏi bạn, hỏi công cụ khác | Log không ghi được bước này → cần khảo sát (Đường A) |
| 6 | Dùng cách hiểu đó | Học tiếp, làm lab, ôn quiz | Hiểu sai ở bước 4 thì sai tiếp ở đây |

**Chỗ đứt nằm ở bước 4 → 5:** khi câu trả lời không chỉ về trang nào, học viên không có cách nào rẻ để kiểm lại. Tài liệu một buổi dài hàng trăm trang. Ví dụ lượt T12018 hỏi nên đọc slide nào thì chỉ được trả lời "từ trang 213 đến 592".

### Core JTBD *(không tên sản phẩm/AI trong câu)*

> **Làm rõ một khái niệm vừa gặp trong tài liệu buổi học, đúng như khoá học trình bày, ngay lúc đang học.**
>
> Job story: *Khi* đang học tài liệu của một buổi và gặp một khái niệm chưa hiểu, *tôi muốn* hiểu khái niệm đó đúng như khoá học trình bày và biết nó nằm ở đâu trong tài liệu, *để* học tiếp ngay và dùng lại được khi làm lab hoặc ôn quiz.

*Tự kiểm:* bỏ hết công nghệ đi thì việc này vẫn còn. Trước đây học viên giơ tay hỏi giảng viên hoặc hỏi bạn ngồi cạnh, rồi tìm lại slide tương ứng để xem.

### Problem statement *(KHÔNG chữ AI)*

> Học viên K4 hỏi trợ giảng ngay trong trang học khi gặp chỗ chưa hiểu. Một phần câu trả lời là lời giảng giải dài, giọng khẳng định, **không chỉ ra trang nào trong tài liệu buổi học** và **cũng không nói rằng nội dung nằm ngoài tài liệu**. Ước tính khoảng **11% câu hỏi nội dung** (≈310/2.817 lượt trong 7 ngày, khoảng tin cậy 7–15%) rơi vào trường hợp này. Học viên không phân biệt được đâu là nội dung của khoá, đâu là kiến thức chung. Họ phải tự tìm lại trong tài liệu dài hàng trăm trang, hoặc tin luôn mà không biết mình có đang hiểu khác bài giảng hay không.

### Pain cụ thể *(đối chiếu tiêu chí 1)*

| Yêu cầu | Nội dung |
|---|---|
| **Ai** | Học viên K4 đang học tài liệu của buổi trên VLearn (slide, video, hướng dẫn lab) |
| **Đang làm gì** | Hỏi tutor ngay trong trang để làm rõ chỗ chưa hiểu |
| **Vướng ở đâu** | Câu trả lời không chỉ trang/đoạn nào, cũng không báo là ngoài tài liệu, nên không kiểm được |
| **Hậu quả** | Phải tự tìm lại trong tài liệu hàng trăm trang, hoặc tin luôn và có thể ôn sai trước quiz *(hậu quả là giả thuyết: log không ghi được, cần Đường A xác nhận)* |

**Bản rút gọn** (nếu ô trong form giới hạn độ dài):
Học viên K4 hỏi tutor khi chưa hiểu tài liệu buổi học, nhưng khoảng 1/10 câu trả lời không chỉ trang nào và cũng không báo là ngoài tài liệu → không biết có khớp bài giảng không → phải tự tìm lại trong hàng trăm trang hoặc tin luôn.

### Evidence — Đường B đã làm · Đường A chưa làm

#### Đường B — mining chatlog

**Nguồn:** `data/vlearn-pack/chatlog/tutor_turns.csv` (data pack BTC, **không commit vào repo**), lọc `cohort_hint = K4`: 3.097 lượt · 448 học viên · 09/09–15/09/2026.

**Phương pháp đếm** (người khác làm lại được):
1. Bỏ tiền tố ngữ cảnh do giao diện tự chèn: `(Đang học phần "…" của buổi này)`.
2. Loại 2 nhóm câu hỏi không cần trích dẫn tài liệu: 203 lượt chào hỏi hoặc câu cụt dưới 15 ký tự, và 77 lượt hỏi về chính tutor ("bạn là model gì"…). Còn lại **2.817 câu hỏi nội dung**.
3. Cột `has_citation = False` → câu trả lời không trích dẫn trang.
4. Trong nhóm không trích dẫn, tách bằng từ khoá: câu trả lời **có báo** ("chưa có dạng văn bản", "dựa trên kiến thức chung", "chưa thể trích xuất", "không có trong tài liệu"…) và **không báo gì**.
5. **Kiểm tay:** lấy ngẫu nhiên 40 lượt trong nhóm "không báo gì" (Python `random.seed(2026)`, `random.sample` trên danh sách theo thứ tự file), đọc từng lượt rồi xếp vào 4 loại ở bảng dưới.

**Kết quả:**

| Chỉ số | Số |
|---|---|
| Toàn log 13.494 lượt, không trích dẫn | 3.781 (28,0%), khớp `DATA_DICTIONARY.md` |
| Câu hỏi nội dung của K4 | 2.817 |
| Trong đó không trích dẫn | 725 (25,7%) |
| ├─ có báo "ngoài tài liệu" (theo từ khoá) | 39 |
| └─ không báo gì (theo từ khoá) | 686 (24,4%): **cận trên**, còn lẫn lượt không đúng loại |
| Kiểm tay 40/686: đúng loại | 18/40 = 45% (KTC 95% Wilson: 31–60%) |
| **Ước tính sau kiểm tay (số chính)** | **≈310 lượt (210–410) · ≈11% câu hỏi nội dung (7–15%) · ≈44 lượt/ngày** |
| Học viên có ≥1 lượt trong nhóm 686 | 166/448 (37,1%): cận trên, chưa hiệu chỉnh theo kiểm tay |
| Trong nhóm 686, câu trả lời dài ≥300 ký tự | 631 (92,0%): đây là giảng giải hẳn hoi, không phải trả lời cụt |

**Bảng kiểm tay 40 lượt:**

| Loại | Số | Mã lượt |
|---|---|---|
| **Đúng loại**: giảng giải khái niệm / câu quiz / hướng dẫn lab, không chỉ trang, không báo | **18** | T11475 · T13457 · T13006 · T11828 · T13280 · T12016 · T13338 · T11373 · T11536 · T11468 · T11172 · T11544 · T11555 · T11580 · T13443 · T13007 · T12955 · T11418 |
| Góp ý code / bài nộp của chính học viên (ít cần trích trang) | 5 | T11095 · T13316 · T12992 · T11132 · T11061 |
| Hành chính, hỏi về tutor, hỏi lại cho rõ, từ chối vì ngoài buổi | 12 | T10655 · T12577 · T10606 · T13352 · T13253 · T12544 · T10293 · T10638 · T10587 · T12086 · T11631 · T10499 |
| Thực ra **có báo** "ngoài tài liệu" nhưng từ khoá không bắt được | 5 | T12678 · T10509 · T10316 · T12679 · T10528 |

→ Đếm bằng từ khoá (686) cho ra con số **gấp khoảng hai lần** thực tế. Nhóm dùng con số sau kiểm tay (~11%) làm số chính. Số 166/448 học viên chỉ dùng làm cận trên.

**Một giả thuyết đã bị chính data bác** *(giữ lại để thấy nhóm đã kiểm)*: ban đầu nhóm nghĩ thiếu nguồn chủ yếu xảy ra khi học viên *hỏi chung, không bôi đen đoạn nào*. Đếm lại thì thấy:

| | Có bôi đen đoạn | Không bôi đen |
|---|---|---|
| K3 | 2.198/5.684 không trích dẫn (**38,7%**) | 744/4.713 (15,8%) |
| K4 | **0 lượt** có bôi đen | 839/3.097 (27,1%) |

→ Lượt có bôi đen còn thiếu nguồn **nhiều hơn**, và log K4 không có lượt bôi đen nào. Nguyên nhân không nằm ở thao tác bôi đen, nên nhóm bỏ cách diễn giải này.

**Ví dụ nguyên văn + nguồn** *(trích ngắn theo quy định bảo mật, tra đầy đủ bằng `turn_id` trong data pack)*:

1. **T10400** · D01 · 10/09 14:41 · `has_citation=False`. Hỏi *"llm là gì"* → *"LLM là viết tắt của **Large Language Model** (Mô hình ngôn ngữ lớn). Đây là một dạng cụ thể của Generative AI…"*. Câu trả lời dài 897 ký tự, không chỉ trang nào, không báo nguồn.
2. **T10405** · D01 · 10/09 14:41. **Cùng câu hỏi, cùng phần học, cùng phút**, nhưng lần này có báo: *"Vì nội dung của đoạn video em đang xem chưa có dạng văn bản, anh chưa thể trích xuất chính xác định nghĩa từ tài liệu bài giảng cho em."*
3. **T10424** · D01 · 10/09 14:48. Lần thứ ba hỏi *"LLM là gì"* trong 7 phút, lại có báo: *"thầy hiện chưa có lời giảng chi tiết từ video để trích xuất nội dung bài học cho em"*. Ba lượt cho ra hai kiểu trả lời, học viên không đoán được mình sẽ nhận kiểu nào.
4. **T10438** · D01 · 10/09 14:56 · `has_citation=False`. Hỏi *"Machine Learning và Deep Learning khác nhau thế nào?"* → nhận 1.189 ký tự giải thích, không nguồn. Đây là kiến thức sẽ vào quiz.
5. **T11644** · D03 · 12/09 11:16 · `has_citation=False`. Hỏi *"graceful failure là cgi"* → *"'Graceful failure' (thất bại duyên dáng) là một nguyên tắc thiết kế hệ thống…"*. Khái niệm này **có** trong tài liệu D03: ở lượt T10831 (11/09), tutor đã dẫn `[trang 224]` cho đúng chủ đề này.
6. **T10855** · D01 · 11/09 09:50 · `has_citation=False`. Hỏi *"Tại sao cần import OpenAI bên trong hàm thay vì ngoài file?"* → được giải thích cơ chế mock nhưng không dẫn về hướng dẫn lab.
7. **T12018** · D03 · 13/09 08:39 · `has_citation=False`. Học viên hỏi thẳng *"t nên đọc kiến thức ở slide nào đẻe hiểu phần này"* → *"(từ trang 213 đến 592 trong danh sách tài liệu)"*: một khoảng khoảng 380 trang, không kiểm nổi.
8. **Đối chứng mặt tốt: T10913** · D01 · 11/09 10:34 · `has_citation=True`. Hỏi *"yolo model ở trang nào"* → *"được đề cập tại trang 196 [trang 196] … và trang 209 [trang 209]"*. Hành vi cần có **đã tồn tại**, chỉ chưa xảy ra đều.

#### Đường A — khảo sát: **CHƯA LÀM** *(hạn: trước CP4, 21:00 17/9)*

- Mục tiêu: ≥20 người ngoài nhóm, ≥50% xác nhận. Log ghi đủ câu hỏi, từng câu trả lời nguyên văn và người trả lời, lưu ở `evidence/khao-sat-log.md`.
- Mục đích: kiểm bước 5 của workflow và phần hậu quả mà log không ghi được (có kiểm lại không, kiểm bằng gì, mất bao lâu, có từng ôn sai không).
- Bộ câu hỏi theo Mom Test (hỏi việc đã xảy ra, không hỏi "bạn có muốn tính năng X không"):
  1. Lần gần nhất bạn hỏi tutor trong trang học là khi nào, lúc đó bạn đang học buổi nào?
  2. Câu trả lời lần đó bạn có kiểm lại không? Nếu có thì kiểm bằng cách nào: lật slide, xem lại video, hỏi bạn hay hỏi ChatGPT?
  3. Từ lúc đọc xong câu trả lời đến lúc yên tâm học tiếp, bạn mất bao lâu?
  4. Có lần nào đọc xong mà bạn không biết nội dung đó có trong bài giảng hay không? Kể lại lần gần nhất.
  5. Sau lần đó bạn còn hỏi tutor tiếp không, hay chuyển sang cách khác? Vì sao bạn chưa bỏ hẳn?

danh sách willing user: 
1. Đào Đức Hải - 2A20260xxxx (E402)
2. Nguyễn Xuân Trường Giang - 2A20260xxxx (E402)
3. Võ Doanh Nhân - 2A20260xxxx (E402)
4. Nguyễn Nhân Sâm - 2a20260xxxx (E402)

## §2. Impact & quyết định chọn
- Bảng impact ≥3 ứng viên (bao nhiêu người · tần suất · tốn gì mỗi lần · khả thi):
- Ứng viên ĐÃ LOẠI + vì sao:
- Ứng viên CHỌN + vì sao (bằng số):

## §3. Giải pháp tương tự đã nghiên cứu
- [Sản phẩm 1]: flow / đáng học / đáng né / mình khác gì
- [Sản phẩm 2]: ...

## §4. Thiết kế
- Lát cắt MỘT CÂU (1 user · 1 việc · 1 quyết định AI · 1 kết quả):
- Non-goals (≥3 thứ KHÔNG build):
- Mức prototype nhắm tới: [ ] Sketch [ ] Mock [ ] Working — phần nào mock, phần nào thật:
- Automation: [ ] augment [ ] conditional [ ] automate — lý do theo cost-of-error:
- §4b. Nguyên tắc đã áp dụng (≥4 — HAX/PAIR, xem guide):
  | Nguyên tắc | Áp cụ thể vào đâu trong prototype |
  |---|---|

## §5. Kiểu lỗi — 4 lớp chỗ khó + kịch bản (≥8) [bảng theo guide §2.5]

## §6. Bốn đường đi của trải nghiệm
- Happy path: · Low-confidence (②): · Failure/không căn cứ (①): · Correction (user sửa):
- Khi bị đòi ngoài phạm vi (③): · Case đặc thù domain (④):

## §7. Kiểm thử
- Chiều chất lượng + định nghĩa kiểm chứng được:
- Golden set (≥20 case theo cơ cấu trong guide §2.6, file trong eval/):
- Quality bar (chốt từ hạn chốt spec của khoá, giữ nguyên sau đó): "Đạt khi ≥ ___% qua bộ, và ___"
- Kết quả các lượt chạy (bảng % — cập nhật đến trước CP6):

## §8. Phân công & kế hoạch
- Phân công có tên: spec / evidence / prompt / code / demo
- Willing users (≥2 tên) + kế hoạch vòng validation *(bonus, nếu làm)*:
  1. Đào Đức Hải - 2A202602752 (E402)
  2. Nguyễn Xuân Trường Giang - 2A202602446 (E402)
  3. Võ Doanh Nhân - 2A202602770 (E402)
  4. Nguyễn Nhân Sâm - 2a202602672 (E402)
- Multi-prototype (nếu làm): trục khác biệt của ≥2 phương án + lý do chọn:

## §9. Changelog
| Thời điểm | Đổi gì | Vì sao (trỏ về feedback/case nào) |
|---|---|---|
| 16/9 | §1: bỏ ý "thiếu nguồn nhất là khi câu hỏi không gắn với đoạn bôi đen" | Data bác: K3 có bôi đen thiếu nguồn 38,7% so với 15,8% khi không bôi đen; K4 không có lượt bôi đen nào |
| 16/9 | §1: số chính đổi từ 686 lượt (24,4%) sang ≈310 lượt (≈11%) | Kiểm tay 40 lượt: chỉ 18/40 đúng loại, đếm bằng từ khoá bị thổi phồng |
