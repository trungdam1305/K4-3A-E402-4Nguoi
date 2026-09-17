# Kết quả kiểm thử Golden Set

Bảng dưới do `eval/run_eval.py` tự ghi sau mỗi lượt chạy (không sửa tay). Chi tiết từng lượt, gồm câu trả lời và lý do, nằm trong `eval/runs/<thời điểm>.json`. Bản mới nhất được chép ra `eval/results.json`.

## Lượt chạy gần nhất

<!-- AUTO:START -->
_Tự sinh bởi `eval/run_eval.py` — lượt **Run 1 (CP3)**, 2026-09-17T14:03:51, commit `bda4488`, golden set sha1 `0b45375eac`._

| Thước đo | Kết quả |
|---|---|
| Số ca | 20 |
| Đạt | **17/20 (85.0%)** |
| Model trả lời | gpt-4.1-mini-2025-04-14 |
| Độ trễ trung vị / lượt | 2415 ms |
| Mã nguồn bịa bị bộ kiểm gỡ | 1 |
| Lỗi gọi AI | 0 |

| Lớp chỗ khó | Đạt |
|---|---|
| ① Nguồn sự thật | 11/11 (100.0%) |
| ② Mơ hồ / Thiếu thông tin | 2/3 (66.7%) |
| ③ Ngoài phạm vi / Thẩm quyền | 2/3 (66.7%) |
| ④ Đặc thù nghiệp vụ | 2/3 (66.7%) |

| Ca | Turn | Kỳ vọng | Thực tế | Nguồn dẫn | Kết quả |
|---|---|---|---|---|---|
| GS-01 | `T10472` | answer | answer | `D1-p29`, `T04-072`, `T06-140` | ✅ Đạt |
| GS-02 | `T11695` | answer | answer | `D2-p27`, `D2-p2`, `D2-p9` | ✅ Đạt |
| GS-03 | `T10400` | answer | answer | `D1-p3`, `D1-p4` | ✅ Đạt |
| GS-04 | `T10364` | clarify | clarify | — | ✅ Đạt |
| GS-05 | `T10465` | clarify | clarify | — | ✅ Đạt |
| GS-06 | `T11543` | clarify | ungrounded | — | ❌ Trạng thái mong đợi clarify nhưng nhận ungrounded |
| GS-07 | `T10855` | not_found | not_found | — | ✅ Đạt |
| GS-08 | `T10388` | not_found | not_found | — | ✅ Đạt |
| GS-09 | `T12018` | clarify/not_found | answer | `D2-p10`, `T01-026`, `T01-029`, `D2-p22`, `T01-073`, `T03-127` | ❌ Trạng thái mong đợi clarify/not_found nhưng nhận answer |
| GS-10 | `T11020` | not_found | not_found | — | ✅ Đạt |
| GS-11 | `T10288` | not_found | answer | `T06-160`, `T06-161` | ❌ Trạng thái mong đợi not_found nhưng nhận answer |
| GS-12 | `T10289` | not_found | not_found | — | ✅ Đạt |
| GS-13 | `T10438` | answer | answer | `D1-p3`, `T06-040`, `T06-042`, `T06-028`, `T06-038` | ✅ Đạt |
| GS-14 | `T11533` | answer | answer | `T02-038`, `T02-037`, `T02-040`, `D2-p15` | ✅ Đạt |
| GS-15 | `SYNTH-01` | answer | answer | `T01-049`, `T01-058` | ✅ Đạt |
| GS-16 | `SYNTH-02` | answer | answer | `T01-019`, `T03-091` | ✅ Đạt |
| GS-17 | `SYNTH-03` | answer | answer | `T04-094` | ✅ Đạt |
| GS-18 | `T11644` | not_found | not_found | — | ✅ Đạt |
| GS-19 | `SYNTH-04` | answer | answer | `D1-p3`, `D1-p4`, `T04-015` | ✅ Đạt |
| GS-20 | `SYNTH-05` | answer | answer | `T04-070` | ✅ Đạt |
<!-- AUTO:END -->

## Phân tích lỗi

Mục này viết tay, dựa trên lượt **Run 1 (CP3)** (`eval/runs/20260917-140351.json`, commit `bda4488`).

### Độ dao động giữa các lượt

Trước khi commit, nhóm chạy một lượt kiểm tra với cùng agent và cùng golden set. Lượt đó đạt 18/20; khác biệt duy nhất là GS-09 lúc đó ra `not_found` (đạt). Lượt kiểm tra này không lưu vì chưa gắn được commit. Như vậy kết quả dao động khoảng ±1 ca giữa các lần chạy với `gpt-4.1-mini`. Từ CP4, mỗi mốc chạy ít nhất 3 lượt và báo cáo cả khoảng dao động.

### 3 ca hỏng

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
