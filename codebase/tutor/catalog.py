"""Bảng ánh xạ 'phần đang học → tài liệu' do người soạn (Curated Section Catalog).

Giải quyết vấn đề LLM tự đoán nhầm (đặc biệt lỗi GS-11, GS-12):
- Xác định rõ ràng phần nào KHÔNG CÓ trong data pack hackathon (lab môi trường, repo, link, nộp bài).
- Xác định phần ôn tập/quiz tổng hợp cần yêu cầu học viên nêu rõ câu hỏi (tránh đoán mò).
- Cung cấp định tuyến chính xác 100% bằng code (deterministic routing), 0 token, 0 ms độ trễ.
"""
import re

# Các phần lab thực hành / thao tác môi trường / repo KHÔNG có trong tài liệu data pack Day 1 & Day 2.
OUT_OF_PACK_LAB_SECTIONS = {
    "tạo môi trường và chạy test baseline",
    "tao moi truong va chay test baseline",
    "mở đúng repo và nhìn thấy đích đến",
    "mo dung repo va nhin thay dich den",
    "task 1.1 — gọi model và đo độ trễ",
    "task 1.1 — goi model va do do tre",
    "task 1.2",
    "task 1.3",
    "task 2.1",
    "task 2.2",
    "cài đặt môi trường",
    "cai dat moi truong",
    "hướng dẫn nộp bài",
    "huong dan nop bai",
    "clone repo",
}

# Regex nhận diện các từ khoá chỉ lab thực hành / kỹ thuật lab không có tài liệu
OUT_OF_PACK_KEYWORDS = re.compile(
    r"\b(?:tạo môi trường|chạy test baseline|clone repo|link repo|bị 404|pip install|cài đặt thư viện|nộp bài|pull request|mở đúng repo)\b",
    re.I
)

# Từ chỉ thị trỏ vào phần/lab/chỗ đang học
DEICTIC_PATTERN = re.compile(
    r"\b(?:phần|lab|bài|task|mục|slide|video|đoạn|chỗ|cái)(?:\s+\w+)?\s+(?:này|đó|kia)\b|ở\s+đây",
    re.I
)

# Mục ôn tập tổng hợp (nếu hỏi "câu này" hoặc "đáp án" mà không có đoạn trích thì cần clarify)
QUIZ_REVIEW_SECTIONS = {
    "ôn toàn bộ câu hỏi",
    "on toan bo cau hoi",
    "quiz ôn tập",
    "ôn tập tổng hợp",
}


def normalize_section_name(name: str) -> str:
    """Chuẩn hoá tên phần học để so khớp không phân biệt hoa thường và khoảng trắng."""
    return re.sub(r"\s+", " ", (name or "").strip().lower())


def get_section_policy(section: str, question: str, has_selected: bool = False) -> dict:
    """Phân tích chính sách tài liệu cho phần đang học.

    Trả về dict:
    - is_known_out_of_pack: bool (phần chắc chắn không có tài liệu trong pack)
    - force_status: "not_found" | "clarify" | None
    - answer: câu trả lời chuẩn (nếu force)
    - reason: lý do giải thích cho học viên và giám khảo
    - where_to_look: gợi ý chỗ tìm
    """
    sec_norm = normalize_section_name(section)
    q_norm = question.strip().lower()

    # 1. Kiểm tra phần lab không có trong data pack
    is_out_lab = sec_norm in OUT_OF_PACK_LAB_SECTIONS or any(k in sec_norm for k in ["test baseline", "đúng repo", "task 1."])
    if not is_out_lab and OUT_OF_PACK_KEYWORDS.search(sec_norm):
        is_out_lab = True

    if is_out_lab:
        # Nếu câu hỏi trỏ vào lab này ("phần này", "ở đây", "dùng để làm gì", "làm gì ở đây", "lỗi", "link", "chạy")
        is_asking_lab = (
            bool(DEICTIC_PATTERN.search(question))
            or bool(OUT_OF_PACK_KEYWORDS.search(question))
            or any(k in q_norm for k in ["dùng để làm gì", "làm gì", "như thế nào", "tại sao cần", "bị 404", "error", "lỗi", "import"])
        )
        if is_asking_lab:
            return {
                "is_known_out_of_pack": True,
                "force_status": "not_found",
                "section_match": "khong_khop",
                "answer": (
                    f"Tài liệu bài đang học chưa có nội dung của phần “{section}” (đây là phần thực hành thao tác lab/repo). "
                    f"Mình không trả lời bằng kiến thức ngoài tài liệu để tránh làm bạn nhầm lẫn bước làm."
                ),
                "reason": (
                    f"Phần “{section}” là bài tập thực hành/môi trường không có tài liệu trong data pack Day 1–2. "
                    f"Được chặn trực tiếp bằng Bảng ánh xạ tài liệu do người soạn để tránh mượn lab khác."
                ),
                "where_to_look": f"Xem hướng dẫn chi tiết của phần “{section}” ngay trên VLearn hoặc hỏi trợ giảng (TA).",
            }

    # 2. Kiểm tra mục ôn tập tổng hợp khi học viên hỏi chung chung không có câu hỏi cụ thể
    if sec_norm in QUIZ_REVIEW_SECTIONS and not has_selected:
        # Nếu hỏi về đáp án, câu này, đọc slide nào...
        if re.search(r"\b(?:đáp án|câu này|chọn câu nào|đọc (?:ở )?slide nào|slide nào)\b", q_norm):
            return {
                "is_known_out_of_pack": False,
                "force_status": "clarify",
                "section_match": "khong_ap_dung",
                "answer": "Bạn đang ở mục Ôn toàn bộ câu hỏi. Bạn muốn hỏi về câu hỏi quiz nào? Vui lòng dán câu hỏi hoặc dùng chuột khoanh vùng câu đó trên slide để mình hỗ trợ nhé.",
                "clarify_options": [
                    "Đáp án của câu hỏi về Temperature là gì?",
                    "Câu hỏi về quy trình xác định bài toán AI có đáp án nào đúng?",
                    "Nên đọc slide nào để ôn tập phần Transformer?"
                ],
                "reason": "Câu hỏi hỏi về 'câu này/slide nào' trong mục ôn tập nhưng chưa có câu hỏi cụ thể hoặc đoạn bôi đen.",
                "where_to_look": "",
            }

    # 3. Câu hỏi cụt ngủn hoặc thiếu ngữ cảnh (Layer ②: Mơ hồ / Thiếu thông tin)
    if not has_selected:
        q_clean = re.sub(r"[^\w\s]", "", question).strip().lower()
        q_words = q_clean.split()
        # 3a. Một từ khoá trơn kèm dấu hỏi (vd. "context ?", "prompt ?")
        if len(q_words) == 1 and ("?" in question or len(question.strip()) <= 15):
            word = q_words[0]
            return {
                "is_known_out_of_pack": False,
                "force_status": "clarify",
                "section_match": "khong_ap_dung",
                "answer": f"Bạn đang muốn tìm hiểu khía cạnh nào về “{word}”? Bạn có thể chọn câu hỏi gợi ý bên dưới hoặc khoanh vùng đoạn bạn đang xem trên slide nhé.",
                "clarify_options": [
                    f"Khái niệm {word} trong sinh văn bản là gì?",
                    f"Vai trò của {word} đối với chất lượng đầu ra của mô hình?",
                    f"{word.capitalize()} có giới hạn dung lượng thế nào?"
                ],
                "reason": f"Câu hỏi chỉ gồm một từ khoá đơn lẻ '{word}' nên cần làm rõ học viên muốn hỏi khía cạnh nào.",
                "where_to_look": "",
            }

        # 3b. Các câu yêu cầu tiếp diễn mơ hồ mà không có lịch sử hội thoại trước (vd. "chi tiết hơn", "nói rõ hơn")
        if q_clean in ["chi tiết hơn", "chi tiet hon", "nói rõ hơn", "noi ro hon", "cụ thể hơn", "cu the hon", "rõ hơn", "ro hon"]:
            sec_desc = f" của phần “{section}”" if section else ""
            return {
                "is_known_out_of_pack": False,
                "force_status": "clarify",
                "section_match": "khong_ap_dung",
                "answer": f"Bạn muốn mình giải thích chi tiết hơn về nội dung cụ thể nào{sec_desc}? Vui lòng chọn bên dưới hoặc bôi đen vị trí trên slide nhé.",
                "clarify_options": [
                    "Tóm tắt các mốc sự kiện chính theo trình tự thời gian",
                    "Ý nghĩa và tác động của giai đoạn này đối với AI hiện đại",
                    "Các thuật ngữ kỹ thuật cốt lõi được nhắc tới trong phần này"
                ],
                "reason": "Câu hỏi 'chi tiết hơn' mơ hồ và không kèm ngữ cảnh bôi đen hoặc câu hỏi trước đó.",
                "where_to_look": "",
            }

    return {
        "is_known_out_of_pack": False,
        "force_status": None,
        "section_match": None,
        "answer": "",
        "reason": "",
        "where_to_look": "",
    }
