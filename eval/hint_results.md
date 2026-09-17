# Kết quả đo luồng gợi ý theo bậc (đề quiz)

_Tự sinh bởi `eval/run_hint_eval.py` — 2026-09-17T23:25:43, commit `6e940f6`, bộ nhãn sha1 `b406b6b661`. Không sửa tay._

Bộ nhãn (`eval/hint_set.json`) là 20 lượt K4 ngẫu nhiên trong mục Quiz/Ôn tập, gắn nhãn tay trước khi viết bộ nhận diện. Ca `other` chỉ kiểm bộ nhận diện, không gọi AI. Nội dung từng bậc gợi ý nằm trong file lượt chạy để người đọc lại kiểm tay xem có lộ đáp án không.

| Thước đo | Kết quả |
|---|---|
| Đạt toàn bộ ca | **19/20** |
| Bộ nhận diện đúng nhãn | 19/20 |
| Đề cần gợi ý được nhận ra | 4/5 |
| Dự đoán "gợi ý" đúng | 4/4 |
| Bậc 1 có nguồn hợp lệ | 4/4 |
| Bậc 2 có câu trích khớp nguyên văn | 4/4 |
| Giải thích (bậc 3 / đề đã có đáp án) có nguồn | 5/5 |
| Gợi ý lộ đáp án bị code gỡ | 0 |
| Độ trễ trung vị bậc 1 / bậc 2 / giải thích | 2999 / 2664 / 4098 ms |
| Ca golden set bị bắt nhầm thành đề quiz | 0 |

| Ca | Turn | Nhãn | Nhận diện | Bậc 1 | Bậc 2 | Giải thích | Kết quả |
|---|---|---|---|---|---|---|---|
| HS-01 | `T11196` | hint | hint | ✅ | ✅ | ✅ | ✅ Đạt |
| HS-02 | `T12258` | hint | hint | ✅ | ✅ | ✅ | ✅ Đạt |
| HS-03 | `T10456` | hint | hint | ✅ | ✅ | ✅ | ✅ Đạt |
| HS-04 | `T11585` | hint | hint | ✅ | ✅ | ✅ | ✅ Đạt |
| HS-05 | `T11226` | hint | other | — | — | — | ❌ |
| HS-06 | `T11623` | explain | explain | — | — | ✅ | ✅ Đạt |
| HS-07 | `T11555` | other | other | — | — | — | ✅ Đạt |
| HS-08 | `T11654` | other | other | — | — | — | ✅ Đạt |
| HS-09 | `T11655` | other | other | — | — | — | ✅ Đạt |
| HS-10 | `T12577` | other | other | — | — | — | ✅ Đạt |
| HS-11 | `T11482` | other | other | — | — | — | ✅ Đạt |
| HS-12 | `T12023` | other | other | — | — | — | ✅ Đạt |
| HS-13 | `T12401` | other | other | — | — | — | ✅ Đạt |
| HS-14 | `T11983` | other | other | — | — | — | ✅ Đạt |
| HS-15 | `T12015` | other | other | — | — | — | ✅ Đạt |
| HS-16 | `T11977` | other | other | — | — | — | ✅ Đạt |
| HS-17 | `T11652` | other | other | — | — | — | ✅ Đạt |
| HS-18 | `T12017` | other | other | — | — | — | ✅ Đạt |
| HS-19 | `T11516` | other | other | — | — | — | ✅ Đạt |
| HS-20 | `T10691` | other | other | — | — | — | ✅ Đạt |
