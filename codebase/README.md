# VLearn Grounded Tutor — prototype

Trợ giảng chỉ trả lời từ slide và transcript của bài đang học. Mỗi ý có mã nguồn bấm được để mở đúng trang slide hoặc đoạn transcript. Tài liệu không có thì nói rõ và chỉ chỗ nên tìm. Câu hỏi mơ hồ thì hỏi lại. Học viên báo nguồn sai thì tìm lại mà không dùng nguồn đó.

**Mức prototype: Working.** Chạy end-to-end trên data pack thật, có lời gọi AI thật (OpenAI, dự phòng bằng Gemini).

| Phần | Thật hay mock |
|---|---|
| Slide Day 1, Day 2 (58 trang, hiển thị bằng PDF.js) | Thật: đọc tại chỗ từ `data/vlearn-pack/slides/` |
| Transcript (700 đoạn `[Txx-NNN]`) | Thật: `data/vlearn-pack/transcript/` |
| Câu hỏi demo, câu trả lời của tutor cũ, danh sách "phần đang học" | Thật: lấy từ `chatlog/tutor_turns.csv` (lượt K4, `K4P1` D01/D03) |
| Tra cứu tài liệu | Thật: BM25 tiếng Việt (âm tiết, cặp âm tiết, dạng bỏ dấu), chỉ dùng thư viện chuẩn |
| Sinh câu trả lời, hỏi lại, từ chối | Thật: OpenAI `gpt-4.1-mini`; model hết lượt hoặc lỗi thì tự chuyển xuống `gpt-4o-mini` rồi tới các model Gemini |
| Kiểm mã nguồn (gỡ mã bịa, hạ cấp câu trả lời không có nguồn) | Thật: `tutor/agent.py::check_citations` |
| Báo nguồn sai → tìm lại | Thật: gọi lại agent với `exclude=[mã bị báo]`, ghi `logs/feedback.jsonl` |
| Đăng nhập, lịch sử chat lâu dài, bôi đen trên slide | **Chưa làm.** Chọn "phần đang học" bằng dropdown thay cho ngữ cảnh VLearn tự chèn |

## Chạy

Cần có:
- Python ≥ 3.9. Không cần `pip install` gì thêm.
- Một công cụ đọc PDF: `pdftotext` (poppler; Git for Windows có sẵn) **hoặc** `pip install pypdf`.
- Ít nhất một key: `OPENAI_API_KEY` và/hoặc `GEMINI_API_KEY` (Gemini lấy miễn phí tại Google AI Studio).
- Data pack của BTC. Mặc định server tìm ở `../K4-Hackathon/data/vlearn-pack`, tức repo đề bài clone cạnh repo này.

```bash
# ở gốc repo
cp codebase/.env.example codebase/.env      # điền key vào codebase/.env — KHÔNG điền vào .env.example
python codebase/server.py                   # mở http://127.0.0.1:8000
```

`codebase/.env` đã được gitignore. `.env.example` thì được commit lên repo công khai, nên tuyệt đối không ghi key thật vào đó.

Các cách chạy khác:

```bash
python codebase/server.py --port 8765                       # đổi cổng
python codebase/server.py --ask "attention là gì" --lecture day1   # hỏi thử trên terminal, in JSON
python codebase/server.py --no-llm                          # tắt AI, chỉ tìm kiếm (không tốn lượt)
```

Link mở thẳng một lượt chatlog: `http://127.0.0.1:8000/#turn=T10472`

| Biến môi trường | Mặc định | Ý nghĩa |
|---|---|---|
| `LLM_PROVIDERS` | `openai,gemini` | Thứ tự nhà cung cấp; nhà nào không có key thì bỏ qua |
| `OPENAI_API_KEY` | — | Key OpenAI |
| `OPENAI_MODEL` | `gpt-4.1-mini` | Model OpenAI chính |
| `OPENAI_FALLBACK_MODELS` | `gpt-4o-mini` | Model OpenAI dự phòng |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Đổi nếu khoá cấp endpoint tương thích OpenAI |
| `GEMINI_API_KEY` | — | Key Gemini |
| `GEMINI_MODEL` | `gemini-3.6-flash` | Model Gemini chính |
| `GEMINI_FALLBACK_MODELS` | `gemini-3.5-flash,gemini-3.1-flash-lite,gemini-flash-lite-latest` | Model Gemini dự phòng |
| `GEMINI_THINKING` | `low` | Mức suy nghĩ của Gemini (`""` để tắt) |
| `VLEARN_DATA_DIR` | tự dò | Đường dẫn tới `vlearn-pack` |

Không có key nào thì server chạy chế độ chỉ tìm kiếm. Model nào báo 429 (hết hạn mức) sẽ bị bỏ qua 1 giờ, và agent chuyển sang model kế tiếp trong chuỗi.

## Demo 4 đường đi (spec §6)

Thanh "Câu hỏi thật của K4" phát lại các lượt thật trong chatlog. Mỗi lượt đều hiện kèm câu trả lời cũ của tutor để so sánh trước/sau.

| Đường đi | Nút | Hành vi mong đợi |
|---|---|---|
| Happy | `chuẩn · …` (T10472, T10400, T11533) | Trả lời ngắn, mỗi ý có thẻ nguồn; slide/transcript tự mở đúng chỗ |
| Low-confidence | `mơ hồ · …` (T10364, T10465) | Hỏi lại một câu, có 2–3 lựa chọn bấm được; bấm thì giữ nguyên "phần đang học" |
| Failure | `khó · …` (T10288, T10855, T11020) | Phần lab/code không có trong tài liệu, hoặc prompt injection: nói rõ "không có trong tài liệu bài này" và chỉ chỗ tìm, không bịa |
| Correction | `sửa nguồn · …` (T11695) | Trả lời xong thì tự bấm ⚑ ở nguồn đầu tiên; agent tìm lại, bỏ nguồn đó |

Nút "Lượt K4 ngẫu nhiên chưa có trích dẫn" bốc một câu thật mà tutor cũ đã trả lời không có nguồn. Nút này dùng để thử trên dữ liệu mình chưa chọn trước.

## Luồng agent (`tutor/agent.py`)

1. **Tách ngữ cảnh.** VLearn tự chèn tiền tố vào câu hỏi: `(Đang học phần “…”)`, `(Trang N, đoạn được chọn: "…")`. Bước này tách tiền tố đó ra, và đánh dấu câu có dấu hiệu prompt injection.
2. **Tra cứu.** Lấy 6 đoạn khớp nhất trong **bài đang học** và 3 đoạn ở **bài khác**. Đoạn ở bài khác chỉ dùng để chỉ đường, không được làm căn cứ.
3. **Gọi LLM, trả về JSON theo schema cố định:** `section_match` (tài liệu có đúng phần đang học không), `status` (`answer` / `clarify` / `not_found`), `answer`, `clarify_options`, `where_to_look`, `reason`. Trường `reason` hiện dưới câu trả lời ở dòng "Vì sao".
4. **Luật cứng cho câu trỏ vào "phần này / lab này / ở đây".** Nếu model đánh giá `section_match = khong_khop` thì kết quả bị ép thành `not_found`, để không mượn tài liệu của phần khác trả lời thay.
5. **Kiểm mã nguồn.** Mã nào không nằm trong danh sách đoạn đã tra thì bị gỡ và báo lên giao diện. Câu `answer` không còn mã hợp lệ nào thì chuyển thành `ungrounded`: giao diện ẩn câu trả lời và hiện cảnh báo.
6. **Không có AI** (không có key, hoặc mọi model đều lỗi): trả `search_only` (chỉ liệt kê đoạn khớp từ khoá, không tự trả lời). Câu có dấu hiệu injection vẫn bị chặn bằng luật cố định.

Mỗi lượt được ghi vào `codebase/logs/runs.jsonl`: câu hỏi, các đoạn đã tra kèm điểm, mã được dẫn, mã bị gỡ, model, độ trễ. File này dùng làm đầu vào cho `eval/`.

## Kết quả đo nhanh (16/09, bộ 8 case khó, chưa phải golden set)

Bộ 8 case gồm T10288, T10289, T10855, T10465, T11020, T10472, cộng 2 câu "phần này…" ở phần có tài liệu (Attention, Lịch sử AI).

| Model | Đúng | Lỗi còn lại |
|---|---|---|
| `gpt-4.1-mini` (mặc định) | 6/8 | T10288 trả lời bằng lab demo PhoBERT (sai phần); câu "phần Attention nói gì" bị từ chối nhầm |
| `gpt-4.1` | 6/8 (bản prompt trước) | T10288; T10289 hỏi lại bằng lựa chọn của lab khác |
| `gemini-3.6-flash` / `3.5-flash` | T10288 đúng (`not_found`) | Chưa chạy đủ bộ vì hết hạn mức free tier |

**T10288 là lỗi đáng kể nhất hiện tại.** Học viên đang ở phần "Tạo môi trường và chạy test baseline" và hỏi "phần lab này dùng để làm gì". Các model OpenAI trả lời bằng đoạn transcript về lab demo self-attention: mã nguồn có thật, nhưng là của một lab khác.

## Dữ liệu và bảo mật

- Repo **không chứa data pack**. Server đọc tại chỗ. `.gitignore` đã chặn `codebase/.cache/` (text trích từ slide), `codebase/logs/`, `data/` và `.env`.
- Mỗi lượt, dữ liệu gửi sang OpenAI/Gemini chỉ gồm câu hỏi và tối đa 9 đoạn tài liệu đã tra. Không gửi mã học viên hay phần chatlog nào khác. Free tier của Gemini có thể dùng dữ liệu để huấn luyện; guide cho phép dùng data pack trong trường hợp này.
- Server chỉ nghe `127.0.0.1`. Slide và transcript chỉ phục vụ theo danh sách tên file cố định.
- Nội dung do học viên gõ và nội dung model sinh ra đều được escape trước khi hiển thị.

## Giới hạn đã biết

- **Hạn mức Gemini free tier:** khoảng 20 lượt/ngày cho mỗi model (đo được với `gemini-3.6-flash` ngày 16/09). OpenAI tính tiền theo token, khoảng 4k token vào + 250 token ra mỗi lượt với `gpt-4.1-mini`.
- **Độ trễ:** OpenAI khoảng 2–5 giây mỗi lượt. Gemini thường 3–12 giây, có lượt lên tới khoảng 25 giây.
- **Tra cứu theo từ khoá (BM25):** câu hỏi diễn đạt khác hẳn chữ trong slide có thể không tìm ra đoạn đúng. Trường hợp này agent sẽ trả `not_found`, không bịa.
- **Text trích từ slide lẫn watermark:** vẫn còn vài mảnh chữ rời của watermark "AI IN ACTION - HACKATHON" trong text dùng để tra cứu. Phần hiển thị không bị ảnh hưởng vì dùng PDF gốc.
- **Nhiều "phần đang học" không có trong pack:** chatlog có nhiều phần thật (các task lab, repo, quiz) không có tài liệu tương ứng trong data pack. Với các phần đó, hành vi đúng là trả `not_found`.
- **Số trang trong tiền tố câu hỏi:** tiền tố `(Trang N, …)` trong chatlog trỏ tới tài liệu gốc trên VLearn (có trang tới 200+), không phải slide bản hackathon 29 trang.
