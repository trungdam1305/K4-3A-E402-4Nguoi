"""Cấu hình chung: đường dẫn data pack, model, bản đồ bài giảng → tài liệu."""
import os
from pathlib import Path

CODEBASE_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = CODEBASE_DIR.parent
CACHE_DIR = CODEBASE_DIR / ".cache"
LOG_DIR = CODEBASE_DIR / "logs"

# Thứ tự nhà cung cấp LLM (LLM_PROVIDERS); nhà nào không có key thì bỏ qua.
DEFAULT_PROVIDERS = ["openai", "gemini"]
DEFAULT_OPENAI_MODEL = "gpt-4.1-mini"
DEFAULT_OPENAI_FALLBACK_MODELS = ["gpt-4o-mini"]
DEFAULT_MODEL = "gemini-3.6-flash"
# Free tier tính hạn mức riêng từng model → hết lượt model chính thì chuyển dần xuống các model này.
DEFAULT_FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-lite-latest"]

# Bài giảng có tài liệu trong data pack. `chatlog` = (course_id, lecture_code) của K4
# trong tutor_turns.csv ứng với bài đó.
LECTURES = {
    "day1": {
        "title": "Day 1 — AI & LLM Foundation",
        "slides": {"D1": "d1-slide-hackathon.pdf"},
        "transcripts": ["transcript-04-clean.md", "transcript-06-clean.md"],
        "chatlog": ("K4P1", "D01"),
    },
    "day2": {
        "title": "Day 2 — Xác định bài toán cho AI",
        "slides": {"D2": "d2-slide-hackathon.pdf"},
        "transcripts": ["transcript-01-clean.md", "transcript-02-clean.md", "transcript-03-clean.md"],
        "chatlog": ("K4P1", "D03"),
    },
}
ALL_SLIDES = {deck: pdf for lec in LECTURES.values() for deck, pdf in lec["slides"].items()}
# transcript-05 không gắn được vào ngày nào → chỉ nằm trong nhóm "bài khác".
ALL_TRANSCRIPTS = [f"transcript-0{i}-clean.md" for i in range(1, 7)]


def load_dotenv():
    """Đọc .env (KEY=VALUE) ở codebase/ hoặc gốc repo; không ghi đè biến đã có."""
    for path in (CODEBASE_DIR / ".env", REPO_DIR / ".env"):
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def find_data_dir() -> Path:
    candidates = []
    if os.environ.get("VLEARN_DATA_DIR"):
        candidates.append(Path(os.environ["VLEARN_DATA_DIR"]))
    candidates += [
        REPO_DIR / "data" / "vlearn-pack",
        REPO_DIR.parent / "K4-Hackathon" / "data" / "vlearn-pack",
    ]
    for c in candidates:
        if (c / "chatlog" / "tutor_turns.csv").is_file():
            return c.resolve()
    tried = "\n  ".join(str(c) for c in candidates)
    raise SystemExit(
        "Không tìm thấy data pack VLearn. Đã thử:\n  " + tried +
        "\nĐặt biến môi trường VLEARN_DATA_DIR trỏ tới thư mục data/vlearn-pack."
    )
