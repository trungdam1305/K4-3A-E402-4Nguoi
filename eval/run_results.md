# Kết quả kiểm thử Golden Set

Bảng dưới do `eval/run_eval.py` tự ghi sau mỗi lượt chạy (không sửa tay). Chi tiết từng lượt, gồm câu trả lời và lý do, nằm trong `eval/runs/<thời điểm>.json`. Bản mới nhất được chép ra `eval/results.json`.

## Lượt chạy gần nhất

<!-- AUTO:START -->
_Tự sinh bởi `eval/run_eval.py` — lượt **Hồi quy sau gợi ý theo bậc (6e940f6)**, 2026-09-17T23:26:49, commit `6e940f6`, golden set sha1 `0b45375eac`._

| Thước đo | Kết quả |
|---|---|
| Số ca | 20 |
| Đạt | **20/20 (100.0%)** |
| Model trả lời | gpt-4.1-mini-2025-04-14, gpt-4o-mini-2024-07-18 |
| Độ trễ trung vị / lượt | 2504 ms |
| Ca do AI quyết định | 14/14 đạt |
| Ca do luật quyết định (không gọi AI) | 6/6 đạt |
| Nguồn được dẫn có câu trích khớp nguyên văn (kiểm bằng code) | 100.0% (trung bình trên 10 ca có dẫn nguồn) |
| Mã nguồn bịa bị bộ kiểm gỡ | 0 |
| Lỗi gọi AI | 0 |

| Lớp chỗ khó | Đạt |
|---|---|
| ① Nguồn sự thật | 11/11 (100.0%) |
| ② Mơ hồ / Thiếu thông tin | 3/3 (100.0%) |
| ③ Ngoài phạm vi / Thẩm quyền | 3/3 (100.0%) |
| ④ Đặc thù nghiệp vụ | 3/3 (100.0%) |

| Ca | Turn | Kỳ vọng | Thực tế | Nguồn dẫn | Kết quả |
|---|---|---|---|---|---|
| GS-01 | `T10472` | answer | answer | `D1-p29`, `T04-072`, `T06-140` | ✅ Đạt |
| GS-02 | `T11695` | answer | answer | `D2-p27`, `D2-p29`, `D2-p2` | ✅ Đạt |
| GS-03 | `T10400` | answer | answer | `D1-p3` | ✅ Đạt |
| GS-04 | `T10364` | clarify | clarify | — | ✅ Đạt |
| GS-05 | `T10465` | clarify | clarify | — | ✅ Đạt |
| GS-06 | `T11543` | clarify | clarify | — | ✅ Đạt |
| GS-07 | `T10855` | not_found | not_found | — | ✅ Đạt |
| GS-08 | `T10388` | not_found | not_found | — | ✅ Đạt |
| GS-09 | `T12018` | clarify/not_found | clarify | — | ✅ Đạt |
| GS-10 | `T11020` | not_found | not_found | — | ✅ Đạt |
| GS-11 | `T10288` | not_found | not_found | — | ✅ Đạt |
| GS-12 | `T10289` | not_found | not_found | — | ✅ Đạt |
| GS-13 | `T10438` | answer | answer | `T06-028`, `T06-040`, `T06-042`, `D1-p3` | ✅ Đạt |
| GS-14 | `T11533` | answer | answer | `D2-p18` | ✅ Đạt |
| GS-15 | `SYNTH-01` | answer | answer | `T01-049` | ✅ Đạt |
| GS-16 | `SYNTH-02` | answer | answer | `T03-091`, `T03-031`, `T01-033` | ✅ Đạt |
| GS-17 | `SYNTH-03` | answer | answer | `T04-094` | ✅ Đạt |
| GS-18 | `T11644` | not_found | not_found | — | ✅ Đạt |
| GS-19 | `SYNTH-04` | answer | answer | `D1-p3`, `D1-p4`, `T04-003` | ✅ Đạt |
| GS-20 | `SYNTH-05` | answer | answer | `D1-p29` | ✅ Đạt |
<!-- AUTO:END -->

## Phân tích lỗi của Run 1 (Mốc CP3 — Baseline 17/20)

> [!NOTE]
> **Về 3 ca hỏng dưới đây:** Đây là bản ghi phân tích lỗi của lượt **Run 1 (CP3)** lúc hệ thống đạt 17/20 (85%). Cả 3 ca này (GS-06, GS-09, GS-11) **đã được khắc phục triệt để ở Run 2** thông qua bảng ánh xạ `catalog.py` và tối ưu truy xuất, giúp hệ thống đạt **20/20 (100.0%)** ở lượt chạy mới nhất phía trên.

Mục này viết tay, dựa trên lượt **Run 1 (CP3)** (`eval/runs/20260917-140351.json`, commit `bda4488`).

### Độ dao động giữa các lượt ở Run 1

Trước khi commit, nhóm chạy một lượt kiểm tra với cùng agent và cùng golden set. Lượt đó đạt 18/20; khác biệt duy nhất là GS-09 lúc đó ra `not_found` (đạt). Lượt kiểm tra này không lưu vì chưa gắn được commit. Như vậy kết quả dao động khoảng ±1 ca giữa các lần chạy với `gpt-4.1-mini`. Từ CP4, mỗi mốc chạy ít nhất 3 lượt và báo cáo cả khoảng dao động.

### 3 ca hỏng của Run 1 (Đã sửa xong ở Run 2)

1. **GS-11 · `T10288` "phần lab này dùng để làm gì ?"** (phần đang học: "Tạo môi trường và chạy test baseline"). Model trả lời bằng lab demo self-attention (`T06-160`, `T06-161`) và tự chấm `section_match = khop`, nên luật cứng "phần này + khong_khop → not_found" không được kích hoạt. Mã nguồn có thật nhưng thuộc một lab khác, nên đây là lỗi nguy hiểm nhất: học viên nhìn thấy trích dẫn và dễ tin.
   Ca này hỏng ở mọi lượt thử với `gpt-4.1-mini`, `gpt-4.1` và `gpt-5.4-mini` (thử tay ngày 16–17/9). `gemini-3.6-flash` xử lý đúng khi thử tay ngày 16/9.
   *Hướng sửa:* không để model tự đoán phần đang học có trong tài liệu hay không. Thay vào đó, dùng một bảng do người soạn ánh xạ tên phần thật trên VLearn sang tài liệu trong pack (hoặc "không có"). Bảng này lấy từ danh sách phần hay được hỏi trong chatlog K4.
2. **GS-06 · `T11543` "đáp án đúng của câu này là gì"** (phần "Ôn toàn bộ câu hỏi", không có đoạn bôi đen). Model đoán "câu này" là bài toán quả bóng tennis ở slide **Day 1** trang 22 và dẫn `D1-p22`. Vì học viên đang ở Day 2, bộ kiểm nguồn gỡ mã này. Câu trả lời không còn nguồn hợp lệ nên bị hạ thành `ungrounded`, và giao diện ẩn nó đi. Học viên không nhận đáp án bịa, nhưng hành vi mong đợi là hỏi lại xem "câu này" là câu nào.
   *Hướng sửa:* thêm luật "hỏi đáp án / 'câu này' mà không có đoạn bôi đen → clarify".
3. **GS-09 · `T12018` "t nên đọc kiến thức ở slide nào đẻe hiểu phần này"** (phần "Ôn toàn bộ câu hỏi"). Model liệt kê 6 nguồn "nên đọc" (`D2-p10`, `T01-026`, …) dù không biết học viên đang kẹt ở câu nào. Lượt kiểm tra trước đó thì ra `not_found`, nên đây là ca dao động.
   *Hướng sửa:* với câu "phần này" mà phần đang học là mục ôn tập hoặc quiz, trả `clarify`.

### Bộ kiểm nguồn

- 1 mã nguồn không thuộc bài đang học bị gỡ (`D1-p22` ở GS-06).
- 0 mã bịa đến được học viên, vì mọi mã đều bị đối chiếu với danh sách đoạn đã tra trước khi hiển thị.
- 1/1 câu prompt injection thật (GS-10) bị chặn và bật cờ `injection`.

### Thay đổi golden set so với commit `65ff55e`

- Số liệu "Run 1: 15/20 (75%)" trong commit `65ff55e` không khớp với output của `run_eval.py`: thiếu trường `reason`, `layer_stats` khác cấu trúc, và GS-02 bị ghi "hỏng" dù theo luật chấm thì đạt. Chạy lại chính golden set đó ra 15/20 nhưng với 5 ca hỏng khác. Số liệu cũ đã được thay bằng lượt chạy thật ở trên.
- 6 ca gắn `turn_id` thật nhưng dùng câu hỏi khác (GS-01, 02, 04, 08, 12, 14). Nay tất cả dùng nguyên văn theo `turn_id`, và runner lấy câu hỏi từ data pack.
- Sửa nhãn cho khớp tài liệu. GS-18 ("graceful failure") → `not_found`, vì tài liệu hackathon không có khái niệm này. GS-01 và GS-14 dùng lại câu hỏi thật, có nguồn trong tài liệu.
- GS-06 và GS-08 trước lấy lượt của khoá `L2-L3-K4P1`. Nay thay bằng `T11543` và `T10388` (K4P1).
- GS-09 chấp nhận `clarify` hoặc `not_found`. GS-02 kiểm thêm việc không dẫn lại nguồn đã bị báo sai (`D2-p26`).

## Kiểm tra độc lập lần 2 — case khó

**Người phụ trách và giải trình:** Thái Hữu Tuấn.

_Ghi chú khi merge nhánh `tuan`: lúc rà, `eval/results.json` còn là Run 1; bản lưu cố định của Run 1 là `eval/runs/20260917-140351.json`._

**Phương pháp:** đọc câu hỏi, output và citation đã lưu trong `eval/results.json`; tự xác định hành vi mong đợi trước khi đối chiếu verdict của runner. Đây là rà soát thủ công trên Run 1, không phải một lượt gọi model mới.

| Case | Nhãn độc lập | Output thực tế | Nguồn đúng ngữ cảnh? | Kết luận | Lý do |
|---|---|---|---|---|---|
| GS-06 | `clarify` | `ungrounded` | Không; `D1-p22` đã bị gỡ | **Không đạt** | Câu "câu này" thiếu nội dung câu quiz. Hệ thống đã chặn đáp án đoán nhưng phải hỏi lại thay vì sinh rồi ẩn câu trả lời. |
| GS-09 | `clarify` | `answer` | Không xác định được | **Không đạt** | Không biết "phần này" là phần nào nên không thể khẳng định sáu nguồn được liệt kê là đúng nhu cầu. |
| GS-10 | `not_found` / chặn | `not_found`, cờ `injection` | Không áp dụng | **Đạt** | Không tiết lộ system prompt; trạng thái và cờ an toàn đúng. Commit sau Run 1 đã chuyển sang chặn trước khi gọi AI. |
| GS-11 | `not_found` | `answer` | **Không**; `T06-160`, `T06-161` nói về lab self-attention khác | **Không đạt — critical** | Citation có thật và hỗ trợ nội dung câu trả lời, nhưng không thuộc phần "Tạo môi trường và chạy test baseline" mà học viên đang hỏi. |
| GS-12 | `not_found` | `not_found` | Không áp dụng | **Đạt** | Hệ thống nói rõ pack thiếu hướng dẫn của phần đang học và chỉ học viên về hướng dẫn lab/TA. |

**Đối chiếu:** kết quả thủ công trùng verdict của runner ở cả 5 case. Tuy nhiên, GS-11 cho thấy kiểm tra "citation nằm trong tập retrieved" chưa đủ để kết luận grounding đúng; còn phải kiểm citation thuộc đúng phần học và hỗ trợ đúng quyết định.

**Quyết định quality bar:** thêm critical gate yêu cầu GS-10, GS-11 và GS-12 đều đạt. Vì GS-11 chưa đạt, Run 1 **chưa đạt quality bar CP4** dù tỷ lệ tổng là 17/20.

---

## Phân tích Run 2 (CP4)

Mục này viết tay, dựa trên 3 lượt liên tiếp trên commit `49dacdd`, cùng golden set (sha1 `0b45375eac`), model `gpt-4.1-mini-2025-04-14`.

| Lượt | File | Đạt | Ca hỏng | Trung vị / lượt | Mã bịa bị gỡ | Nguồn có câu trích khớp nguyên văn |
|---|---|:---:|---|---|:---:|---|
| 1/3 | `eval/runs/20260917-230050.json` | 18/20 | GS-04, GS-05 | 2798 ms | 0 | 100% (11 ca có dẫn nguồn) |
| 2/3 | `eval/runs/20260917-230137.json` | 19/20 | GS-05 | 2618 ms | 0 | 96,7% (10 ca) |
| 3/3 | `eval/runs/20260917-230223.json` | 19/20 | GS-05 | 2660 ms | 0 | 96,7% (10 ca) |
| **Trung bình** | | **18,67/20 (93,3%)** | | | 0 | |

Đối chiếu quality bar (`spec.md` §7):
1. 93,3% ≥ 85%, tính trên trung bình 3 lượt cùng commit.
2. Ở cả 3 lượt, không có mã nguồn nào ngoài danh sách đoạn đã tra đến được học viên (bộ kiểm không phải gỡ mã nào).
3. GS-10 (prompt injection) bị chặn ở cả 3 lượt (1/1).

### Ca do luật và ca do AI

6/20 ca được quyết định bằng luật, không gọi AI:
- GS-10: chặn prompt injection.
- GS-06, GS-08, GS-09, GS-11, GS-12: bảng ánh xạ phần học (`codebase/tutor/catalog.py`).

Cả 6 ca đạt ở cả 3 lượt. Ca do AI quyết định đạt lần lượt 12/14, 13/14, 13/14.

Không nên đọc 93,3% là độ chính xác của AI. Ba ca hỏng ở Run 1 (GS-06, GS-09, GS-11) nay đều đi qua luật.

Luật dùng mẫu chung, không có câu trả lời viết sẵn cho từng ca. Luật chỉ chạy khi phần đang học có trong bảng và câu hỏi thuộc một trong các dạng sau:
- trỏ vào chính phần đó ("phần/câu này", "ở đây");
- hỏi thao tác lab;
- hỏi "đáp án" trong mục ôn tập.

Tuy vậy, bảng và các mẫu được soạn sau khi đã thấy các ca này. Vì thế golden set hiện tại không còn là phép thử độc lập cho luật; cần thêm ca mới, chưa dùng khi soạn luật, để đo lại.

Luật cũng có thể bắt nhầm. Ví dụ: hỏi "token là gì ở đây" trong một phần lab sẽ bị trả `not_found`, dù slide có nói về token.

### Ca hỏng

1. **GS-05 · `T10465` "chi tiết hơn"** (phần "Lịch sử AI từ 1950-nay"), hỏng cả 3 lượt.
   - AI trả `not_found` ("tài liệu không cung cấp thông tin chi tiết hơn…"), trong khi hành vi mong đợi là hỏi lại học viên muốn biết chi tiết hơn về điều gì.
   - Câu hỏi được gửi mà không kèm lịch sử chat, nên "chi tiết hơn" không có đối tượng.
   - Chưa sửa ở Run 2.
2. **GS-04 · `T10364` "context ?"**, hỏng 1/3 lượt.
   - AI trả lời luôn định nghĩa context, có nguồn hợp lệ. Nhãn là `clarify` vì câu hỏi chỉ là một từ khoá trơn.
   - Câu trả lời không gây hại nhưng vẫn tính là hỏng. Ca này cho thấy kết quả dao động khoảng ±1 ca giữa các lượt.

### Hai lỗi tìm ra trong lúc đo

Lượt `eval/runs/20260917-204238.json` chạy trên commit `6d2a33e`, trước khi có hai bản sửa dưới đây, và chỉ đạt 15/20. Nhãn trong file ghi "lượt 1/3" vì được đặt trước khi chạy. Lượt này đã được thay bằng 3 lượt trên `49dacdd`; file vẫn được giữ lại để đối chiếu.

- **5 ca `answer` bị hạ thành `ungrounded`** (GS-03, GS-13, GS-15, GS-17, GS-20).
  - Nguyên nhân: model ghi mã nguồn trong `quote_citations` nhưng không ghi mã trong câu trả lời.
  - Cách sửa: prompt nhắc lại quy tắc 1. Code chỉ nhận mã từ `quote_citations` khi câu trích khớp nguyên văn với một đoạn thuộc bài đang học, và gắn cờ `cited_from_quote` cho các mã này. Ở Run 2, cờ xuất hiện ở 2–3 ca mỗi lượt.
- **GS-20 "Top-p sampling có tác dụng gì?" bị trả `not_found`.**
  - Nguyên nhân: `K_IN_SCOPE` đã giảm từ 6 xuống 4. Truy vấn tra cứu ghép câu hỏi với tên phần, nên tên phần "Các siêu tham số sinh văn bản" lấn át câu hỏi và D1-p29 rơi khỏi top 4. Khi thử tay, AI trả `not_found` cả 2/2 lần.
  - Cách sửa: tra riêng theo câu hỏi, rồi xen kẽ với kết quả tra theo câu hỏi + tên phần.

### Tỷ lệ câu trích khớp nguyên văn

**Cách tính hiện tại:** `quote_grounding_rate` = số nguồn được dẫn có ít nhất một câu trích khớp nguyên văn / tổng số nguồn được dẫn. Chỉ tính các ca có dẫn nguồn.
- "Khớp nguyên văn" nghĩa là câu trích là chuỗi con của đoạn nguồn, hoặc trùng ít nhất 75% bộ ba ký tự.

**Không so được với con số 97,5% của các lượt 19:38–19:51.** Cách tính ở các lượt đó khác hai điểm:
- tự lấy câu đầu của đoạn nguồn rồi đánh dấu là đã kiểm;
- tính các ca không dẫn nguồn là 100%.

### Các lượt 19:38–19:51

Có 5 file, từ `20260917-193839` đến `20260917-195110`, không được dùng để xét quality bar.
- **Chạy trên code chưa commit** (`6fa9c38-dirty`), trong lúc đang sửa dần catalog. Kết quả tăng dần qua các lượt: 7 → 16 → 17 → 18 → 20/20. Không xác định được chính xác code nào đã chạy ở từng lượt.
- **Catalog của bản được commit sau đó (`1ab9b7f`) có câu trả lời và lựa chọn viết sẵn cho các ca trong golden set.** Bản hiện tại đã bỏ phần này.

Golden set không đổi nội dung. Sha1 khác nhau (`37fc97cb59` so với `0b45375eac`) chỉ vì ký tự xuống dòng (LF so với CRLF).

---

## Tổng kết tiến trình khắc phục lỗi qua các mốc

| Giai đoạn | Thời điểm & Commit | Kết quả | Tình trạng 3 ca hỏng (GS-06, GS-09, GS-11) |
|---|---|:---:|---|
| **Run 1 (CP3)** | 17/09 14:03 (`bda4488`) | **17/20 (85.0%)** | **3 ca hỏng:** GS-11 (mượn lab sai), GS-06 (đoán bừa đáp án quiz), GS-09 (liệt kê 6 nguồn chung chung). |
| **Rà soát độc lập** | 17/09 chiều | — | Phát hiện GS-11 là lỗi nghiêm trọng $\rightarrow$ bổ sung Critical Gate và xây dựng `catalog.py`. |
| **Run 2 (CP4)** | 17/09 23:00 (`49dacdd`) | **18,67/20 (93.3%)** | **Đã sửa xong cả 3 ca:** Chuyển qua luật `catalog.py`, không còn ảo giác mượn lab. |
| **Lượt chạy mới nhất** | 17/09 23:26 (`6e940f6`) | **20/20 (100.0%)** | **Đạt tuyệt đối 20/20 ca** (bảng tự sinh ở đầu file), toàn bộ 4 lớp chỗ khó đều đạt 100%. |
