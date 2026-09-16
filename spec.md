# Template AI Spec *(spec.md — commit trước hạn chốt spec: 21:00 17/9, tại CP4 · quality bar chốt từ thời điểm nộp)*

> Cấu trúc phủ đúng "SPEC 8 phần" của chương trình: Bằng chứng (§1-§2) · Lát cắt (§4) · Canvas (đính kèm CP1) · Augment/Automate (§4) · 4 đường đi của trải nghiệm (§6) · Kiểu lỗi (§5) · Kiểm thử (§7) · Phân công (§8). Hướng dẫn viết từng mục: `02-guide.md`.

```markdown
# AI SPEC — [Tên lát cắt] · Nhóm [4Nguoi] · Zone [C1]
Hướng: [x] A — VLearn  [ ] B — Trợ lý Học viên  [ ] C — Làn mở
Loại: [ ] Tối ưu tính năng có sẵn  [ ] Tính năng mới

## §1. User & Job
- Job executor + workflow (đính kèm worksheet JTBD / ảnh sơ đồ):
- Core JTBD (không tên sản phẩm/AI trong câu):
- Problem statement (KHÔNG chữ AI):
- Evidence (chuẩn A và/hoặc B — log đầy đủ trong repo):
  - Số liệu mining / kết quả khảo sát (n = ?, % xác nhận):
  - ≥5 quote/ví dụ nguyên văn + nguồn:
  01 · Người dùng & nỗi đau
Tiêu đề:

Học viên hỏi tutor nhưng không kiểm được câu trả lời có đúng bài giảng không

Người dùng: học viên K4 đang tự đọc slide trên VLearn, trong hoặc sau buổi học, và hỏi tutor khi gặp chỗ chưa hiểu.

Job: làm rõ ngay khái niệm vừa đọc mà chưa hiểu, và chắc chắn cách hiểu đó khớp với bài giảng của khoá, không phải rời trang tài liệu.

Pain: nhiều câu trả lời của tutor không ghi dựa vào trang hay đoạn nào, nhất là khi câu hỏi không gắn với đoạn đang bôi đen (hỏi theo số slide, hỏi chung cả bài). Học viên không phân biệt được đâu là nội dung bài giảng, đâu là AI tự suy ra. Họ phải tự lật lại slide hoặc transcript, hoặc hỏi bạn và ChatGPT để kiểm lại. Việc này mất thời gian, dễ khiến họ ôn sai trước quiz và dần mất niềm tin vào tutor.

Bản rút gọn (nếu ô trong form giới hạn độ dài):

Học viên K4 tự học slide trên VLearn, hỏi tutor khi chưa hiểu, nhưng nhiều câu trả lời không ghi dựa vào trang/đoạn nào → không biết có khớp bài giảng không → phải tự lật lại tài liệu hoặc hỏi nơi khác, mất thời gian và dễ ôn sai trước quiz.

Đối chiếu tiêu chí 1 ("Pain cụ thể")
Yêu cầu	
Ai  |	Học viên K4 đang tự đọc slide trên VLearn
Đang làm gì  |	Hỏi tutor để làm rõ chỗ chưa hiểu
Vướng ở đâu  |	Câu trả lời không có nguồn, không kiểm được
Hậu quả    |	Mất thời gian kiểm lại, dễ ôn sai, mất niềm tin
danh sách willing user: 1. Đào Đức Hải - 2A202602752 (E402)


2. Nguyễn Xuân Trường Giang - 2A202602446 (E402)
3. Võ Doanh Nhân - 2A202602770 (E402)
4. Nguyễn Nhân Sâm - 2a202602672 (E402)

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
- Multi-prototype (nếu làm): trục khác biệt của ≥2 phương án + lý do chọn:

## §9. Changelog
| Thời điểm | Đổi gì | Vì sao (trỏ về feedback/case nào) |
```
