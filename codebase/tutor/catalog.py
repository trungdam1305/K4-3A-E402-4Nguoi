"""Bảng ánh xạ 'phần đang học → tài liệu' do người soạn (curated section catalog).

Tên phần lấy từ tiền tố câu hỏi K4 (K4P1 D01/D03) trong chatlog, đối chiếu tay với slide Day 1–2 và
đề mục transcript. Luật chỉ áp dụng khi phần đang học có trong bảng VÀ câu hỏi trỏ vào chính phần đó
("phần/lab/câu này", "ở đây") hoặc hỏi thao tác lab / đáp án — còn lại để AI quyết định.
Không có câu trả lời hay lựa chọn viết sẵn theo từng ca kiểm thử.
"""
import re

# Phần thực hành / hướng dẫn / tài liệu riêng KHÔNG có trong slide + transcript của data pack.
OUT_OF_PACK_SECTIONS = {
    # Day 1
    "mở đúng repo và nhìn thấy đích đến",
    "lấy repo và nhìn thấy đích đến",
    "dựng môi trường và chạy test baseline",
    "tạo môi trường và chạy test baseline",
    "task 1.1 — gọi model và đo độ trễ",
    "code gợi ý: task 1.1 — gọi model và đo độ trễ",
    "task 1.2 — tái sử dụng cho model nhỏ hơn",
    "task 1.3 — so sánh hai model trên cùng một prompt",
    "hoàn thành task 1: gọi gpt-4o và đo latency",
    "part 2 — system prompt, token và chi phí",
    "code gợi ý: part 2 — system prompt, token và chi phí",
    "part 3 — streaming, history và retry",
    "part 4 — ghép thành trợ lý cli",
    "bonus — cho bạn nào xong sớm",
    "trả lời exercises, tự chấm và nộp bài",
    "nộp bài và đánh giá lab",
    # Day 2
    '📖 "sổ tay từ điển" bỏ túi cho người mới (non-tech dictionary)',
    'phần 1: chuẩn bị "bàn làm việc" (khoảng 15 phút)',
    "phần 2: scan cá nhân — tìm ít nhất 5 vấn đề thật (khoảng 25 phút)",
    "phần 3: chọn top 3 problem card + vẽ workflow nháp (khoảng 35 phút)",
    "phần 5: kiểm chứng nhanh + research giải pháp đã có (khoảng 30 phút)",
    "phần 9: đóng gói và nộp bài",
    "day 02_ ai product lab",
    "day 02_ ai product lab (2)",
    "day 02_c401_ai product lab",
    "checklist tự kiểm tra trước khi đóng máy",
}

# Mục ôn tập / quiz: nhiều câu hỏi trong một phần, không biết "câu này" là câu nào.
REVIEW_SECTIONS = {
    "quiz cuối ngày",
    "ôn toàn bộ câu hỏi",
    "luyện theo đề xuất",
    "kiến thức trọng tâm",
}

# Câu hỏi trỏ vào chính phần đang học.
DEICTIC_PATTERN = re.compile(
    r"\b(?:phần|lab|bài|task|mục|slide|video|đoạn|chỗ|cái|câu|nội dung)(?:\s+\w+)?\s+(?:này|đó|kia|trên)\b|ở\s+đây",
    re.I,
)
# Thao tác lab / hành chính mà tài liệu học không trả lời được.
LAB_OPS_PATTERN = re.compile(
    r"\b(?:clone repo|link repo|repo bị|bị 404|pip install|cài thư viện|nộp bài|pull request|fork repo)\b",
    re.I,
)
ASKS_ANSWER = re.compile(r"\bđáp án\b", re.I)

NO_POLICY = {"is_known_out_of_pack": False, "force_status": None, "section_match": None,
             "answer": "", "reason": "", "where_to_look": "", "clarify_options": []}


def normalize_section_name(name: str) -> str:
    """Chuẩn hoá tên phần học để so khớp không phân biệt hoa thường và khoảng trắng."""
    return re.sub(r"\s+", " ", (name or "").strip().lower())


def get_section_policy(section: str, question: str, has_selected: bool = False) -> dict:
    """Trả chính sách cho phần đang học; force_status = None nghĩa là để AI quyết định."""
    sec_norm = normalize_section_name(section)
    if not sec_norm or has_selected:
        return dict(NO_POLICY)
    deictic = bool(DEICTIC_PATTERN.search(question))

    if sec_norm in OUT_OF_PACK_SECTIONS and (deictic or LAB_OPS_PATTERN.search(question)):
        return {
            **NO_POLICY,
            "is_known_out_of_pack": True,
            "force_status": "not_found",
            "section_match": "khong_khop",
            "answer": (f"Tài liệu của trợ giảng (slide và transcript Day 1–2) chưa có nội dung của phần “{section}”, "
                       "nên mình không trả lời để tránh đoán sai bước làm."),
            "reason": (f"Phần “{section}” là hướng dẫn thực hành / tài liệu riêng, không nằm trong slide và transcript "
                       "mà trợ giảng được dùng (bảng ánh xạ phần học soạn tay)."),
            "where_to_look": f"Xem hướng dẫn của phần “{section}” ngay trên VLearn, hoặc hỏi giảng viên/TA.",
        }

    if sec_norm in REVIEW_SECTIONS and (deictic or ASKS_ANSWER.search(question)):
        return {
            **NO_POLICY,
            "force_status": "clarify",
            "section_match": "khong_ap_dung",
            "answer": (f"Bạn đang hỏi câu nào trong phần “{section}”? Hãy dán nội dung câu hỏi, hoặc khoanh vùng câu đó "
                       "trên slide, để mình tìm đúng trang trong tài liệu."),
            "reason": "Phần ôn tập có nhiều câu; câu hỏi chưa nói rõ câu nào nên mình hỏi lại thay vì đoán.",
        }

    return dict(NO_POLICY)
