"""Nạp tài liệu thật từ data pack: slide PDF (theo trang), transcript (theo mã đoạn), chatlog.

Không copy data vào repo — mọi thứ đọc tại chỗ từ VLEARN_DATA_DIR; phần text trích từ PDF
chỉ cache ở codebase/.cache (đã gitignore).
"""
import csv
import json
import re
import shutil
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path

from .config import ALL_SLIDES, ALL_TRANSCRIPTS, CACHE_DIR


@dataclass
class Chunk:
    id: str            # "D1-p7" (slide) | "T04-012" (transcript)
    kind: str          # "slide" | "transcript"
    source: str        # tên file trong data pack
    title: str         # dòng đầu của slide / heading của đoạn transcript
    text: str
    label: str         # nhãn hiển thị cho học viên
    page: int = 0      # slide: số trang (1-based)
    deck: str = ""     # slide: "D1" | "D2"

    def public(self, snippet_len=320):
        d = asdict(self)
        d["snippet"] = self.text[:snippet_len] + ("…" if len(self.text) > snippet_len else "")
        del d["text"]
        return d


# ---------------------------------------------------------------- slide PDF

_WATERMARK = "AIINACTION-HACKATHON" * 2
_CLEAN_VERSION = 2  # tăng khi đổi clean_slide_text để bỏ cache cũ
_UPPER_TOKEN = re.compile(r"^[A-Z-]+$")
_DECK_HEADER = re.compile(r"^(?:AI IN ACTION\W*)?DAY\s*0?\d+$", re.I)  # dòng đầu trang kiểu "Day 1"


def _is_watermark(tokens):
    joined = "".join(tokens)
    if len(tokens) == 1:
        return len(joined) >= 3 and joined in _WATERMARK
    return len(joined) >= 2 and joined in _WATERMARK


def clean_slide_text(text: str) -> str:
    """Bỏ các mảnh chữ rời của watermark "AI IN ACTION - HACKATHON" mà pdftotext trộn vào."""
    out_lines = []
    for line in text.splitlines():
        tokens = line.split()
        # Ghép chữ giãn cách ("D I A M O N D" → "DIAMOND") trừ khi đó là mảnh watermark.
        merged, i = [], 0
        while i < len(tokens):
            j = i
            while j < len(tokens) and len(tokens[j]) == 1 and tokens[j].isalpha():
                j += 1
            if j - i >= 3 and "".join(tokens[i:j]) not in _WATERMARK:
                merged.append("".join(tokens[i:j]))
                i = j
            else:
                merged.append(tokens[i])
                i += 1
        # Xoá tham lam chuỗi token dài nhất khớp watermark.
        kept, i = [], 0
        while i < len(merged):
            best = 0
            j = i
            while j < len(merged) and _UPPER_TOKEN.match(merged[j]):
                if _is_watermark(merged[i:j + 1]):
                    best = j + 1 - i
                j += 1
            if best:
                i += best
            else:
                kept.append(merged[i])
                i += 1
        line = " ".join(kept).strip()
        # Dòng chỉ còn một mảnh watermark ngắn ("AT", "CK") → bỏ cả dòng.
        if line and not (_UPPER_TOKEN.match(line) and line in _WATERMARK):
            out_lines.append(line)
    return "\n".join(out_lines)


def _find_pdftotext():
    exe = shutil.which("pdftotext")
    if exe:
        return exe
    for p in (r"C:\Program Files\Git\mingw64\bin\pdftotext.exe", "/opt/homebrew/bin/pdftotext", "/usr/local/bin/pdftotext"):
        if Path(p).is_file():
            return p
    return None


def extract_pdf_pages(pdf: Path) -> list[str]:
    try:
        from pypdf import PdfReader  # tuỳ chọn: pip install pypdf
        return [p.extract_text() or "" for p in PdfReader(str(pdf)).pages]
    except ImportError:
        pass
    exe = _find_pdftotext()
    if not exe:
        raise SystemExit("Cần `pip install pypdf` hoặc cài poppler (pdftotext) để đọc slide PDF.")
    raw = subprocess.run([exe, "-enc", "UTF-8", str(pdf), "-"], capture_output=True, check=True).stdout
    pages = raw.decode("utf-8", errors="replace").split("\f")
    if pages and not pages[-1].strip():
        pages.pop()
    return pages


def load_slides(data_dir: Path) -> list[Chunk]:
    chunks = []
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    for deck, name in ALL_SLIDES.items():
        pdf = data_dir / "slides" / name
        stat = pdf.stat()
        cache = CACHE_DIR / f"{pdf.stem}-{stat.st_size}-{int(stat.st_mtime)}-v{_CLEAN_VERSION}.json"
        if cache.is_file():
            pages = json.loads(cache.read_text(encoding="utf-8"))
        else:
            pages = [clean_slide_text(p) for p in extract_pdf_pages(pdf)]
            cache.write_text(json.dumps(pages, ensure_ascii=False), encoding="utf-8")
        day = deck[1:]
        for n, text in enumerate(pages, start=1):
            if not text.strip():
                continue
            title = next((l.strip(" -—·") for l in text.splitlines()
                          if len(l.strip(" -—·")) > 3 and not _DECK_HEADER.match(l.strip(" -—·"))), f"Trang {n}")
            chunks.append(Chunk(
                id=f"{deck}-p{n}", kind="slide", source=name, title=title[:120], text=text,
                label=f"Slide Day {day} · trang {n}", page=n, deck=deck,
            ))
    return chunks


# ---------------------------------------------------------------- transcript

_PARA = re.compile(r"^\*\*\[(T\d{2}-\d{3})\]\*\*\s*(.*)$")


def parse_transcript(path: Path) -> tuple[str, list[Chunk]]:
    lines = path.read_text(encoding="utf-8").splitlines()
    session = lines[0].split("(bản sạch) — ", 1)[-1].strip() if lines else path.stem
    heading, chunks, current = "", [], None
    for line in lines[1:]:
        m = _PARA.match(line)
        if m:
            current = Chunk(
                id=m.group(1), kind="transcript", source=path.name, title=heading,
                text=m.group(2).strip(), label=f"Transcript {m.group(1)}",
            )
            chunks.append(current)
        elif line.startswith("## "):
            heading, current = line[3:].strip(), None
        elif line.startswith("#"):
            current = None
        elif line.startswith(">") or not line.strip():
            continue
        elif current is not None:  # dòng liệt kê nối tiếp đoạn phía trên
            current.text += "\n" + line.strip()
    for c in chunks:
        c.title = f"{session} · {c.title}" if c.title else session
    return session, chunks


def load_transcripts(data_dir: Path) -> tuple[dict, list[Chunk]]:
    sessions, chunks = {}, []
    for name in ALL_TRANSCRIPTS:
        session, part = parse_transcript(data_dir / "transcript" / name)
        sessions[name] = session
        chunks += part
    return sessions, chunks


# ---------------------------------------------------------------- chatlog

_CHAT_FIELDS = ("turn_id", "cohort_hint", "asked_at_vn", "lecture_code", "lecture_title", "course_id",
                "is_preset", "student_question", "tutor_reply", "move_used", "has_citation", "rating")

_CTX_SECTION = re.compile(r"^\((?:Đang học phần|Currently on the part) [“\"](.+?)[”\"] (?:của buổi này|of this lesson)\)\s*")
_CTX_PAGE = re.compile(r"^\((?:Trang|Page) (\d+), (?:đoạn được chọn|selected passage): [“\"](.*?)[”\"]\)\s*", re.S)
_CTX_QUOTED = re.compile(r"\s*(?:Đoạn đang hỏi|The passage in question):\s*[“\"](.+?)[”\"]\s*$", re.S)


def split_question(raw: str) -> dict:
    """Tách tiền tố ngữ cảnh mà VLearn tự chèn vào câu hỏi (phần đang học / đoạn bôi đen)."""
    q, ctx = raw.strip(), {"section": "", "page": None, "selected": ""}
    m = _CTX_SECTION.match(q)
    if m:
        ctx["section"], q = m.group(1).strip(), q[m.end():]
    m = _CTX_PAGE.match(q)
    if m:
        ctx["page"], ctx["selected"], q = int(m.group(1)), m.group(2).strip(), q[m.end():]
    m = _CTX_QUOTED.search(q)
    if m:
        ctx["selected"], q = m.group(1).strip(), q[:m.start()]
    ctx["question"] = q.strip()
    return ctx


def load_chatlog(data_dir: Path) -> list[dict]:
    rows = []
    with open(data_dir / "chatlog" / "tutor_turns.csv", encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            row = {k: r[k] for k in _CHAT_FIELDS}
            row["is_preset"] = r["is_preset"] == "True"
            row["has_citation"] = r["has_citation"] == "True"
            rows.append(row)
    return rows
