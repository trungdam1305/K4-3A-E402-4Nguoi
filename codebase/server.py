"""Server local cho prototype VLearn Grounded Tutor (chỉ thư viện chuẩn Python).

    python codebase/server.py                 # mở http://127.0.0.1:8000
    python codebase/server.py --ask "llm là gì" --lecture day1   # hỏi thử trên terminal
"""
import argparse
import json
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from tutor.agent import Tutor
from tutor.config import ALL_SLIDES, ALL_TRANSCRIPTS, CODEBASE_DIR, LECTURES, find_data_dir, load_dotenv, REPO_DIR
from tutor.llm import LLMClient

STATIC = {"/": ("index.html", "text/html; charset=utf-8"),
          "/index.html": ("index.html", "text/html; charset=utf-8"),
          "/app.js": ("app.js", "text/javascript; charset=utf-8")}
MAX_BODY = 64 * 1024

tutor: Tutor = None


class Handler(BaseHTTPRequestHandler):
    server_version = "VLearnTutor/0.2"

    def log_message(self, fmt, *args):
        if "/api/ask" in self.path or "/api/feedback" in self.path:
            sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

    # ---------------------------------------------------------------- helpers

    def _send(self, status, body: bytes, ctype: str, extra=None):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass  # trình duyệt huỷ tải (vd. đổi trang PDF giữa chừng)

    def _json(self, data, status=HTTPStatus.OK):
        self._send(status, json.dumps(data, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8")

    def _error(self, status, message):
        self._json({"error": message}, status)

    def _body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            raise ValueError("Body quá lớn")
        return json.loads(self.rfile.read(length).decode("utf-8") or "{}")

    # ---------------------------------------------------------------- routes

    def do_GET(self):
        url = urlparse(self.path)
        path, qs = url.path, parse_qs(url.query)
        arg = lambda k, d="": qs.get(k, [d])[0]

        if path in STATIC:
            name, ctype = STATIC[path]
            return self._send(HTTPStatus.OK, (CODEBASE_DIR / name).read_bytes(), ctype)

        if path == "/api/health":
            return self._json({
                "ok": True, "llm": tutor.llm is not None,
                "model": tutor.llm.model if tutor.llm else None,
                "models": tutor.llm.models if tutor.llm else [],
                "data_dir": tutor.data_dir.name, **tutor.stats,
            })

        if path == "/api/lectures":
            return self._json({
                "lectures": [
                    {"id": k, "title": v["title"], "decks": v["slides"], "transcripts": v["transcripts"],
                     "sections": tutor.sections(k)}
                    for k, v in LECTURES.items()
                ] + [{"id": "all", "title": "Toàn bộ tài liệu trong pack", "decks": ALL_SLIDES,
                      "transcripts": ALL_TRANSCRIPTS, "sections": []}],
                "transcripts": tutor.sessions,
            })

        if path == "/api/scenarios":
            return self._json({"scenarios": tutor.scenarios()})

        if path == "/api/eval/golden_set":
            p = REPO_DIR / "eval" / "golden_set.json"
            if p.is_file():
                return self._send(HTTPStatus.OK, p.read_bytes(), "application/json; charset=utf-8")
            return self._error(HTTPStatus.NOT_FOUND, "Chưa có file golden set")

        if path == "/api/eval/results":
            p = REPO_DIR / "eval" / "results.json"
            if p.is_file():
                return self._send(HTTPStatus.OK, p.read_bytes(), "application/json; charset=utf-8")
            return self._error(HTTPStatus.NOT_FOUND, "Chưa có file kết quả kiểm thử")

        if path == "/api/turns/random":
            turn = tutor.random_turn(arg("lecture", "day1"), uncited_only=arg("uncited", "1") == "1")
            return self._json({"turn": turn}) if turn else self._error(HTTPStatus.NOT_FOUND, "Không có lượt phù hợp")

        if path.startswith("/api/turns/"):
            row = tutor.turns.get(path.rsplit("/", 1)[-1])
            if not row:
                return self._error(HTTPStatus.NOT_FOUND, "Không có lượt này")
            key = (row["course_id"], row["lecture_code"])
            lecture = next((k for k, v in LECTURES.items() if v["chatlog"] == key), None)
            return self._json({"turn": tutor.turn_public(row), "lecture": lecture})

        if path.startswith("/api/transcript/"):
            name = path.rsplit("/", 1)[-1]
            if name not in tutor.sessions:
                return self._error(HTTPStatus.NOT_FOUND, "Không có transcript này")
            paras = [c.public(snippet_len=10**6) for c in tutor.index.chunks if c.source == name]
            for p in paras:
                p["text"] = p.pop("snippet")
            return self._json({"file": name, "session": tutor.sessions[name], "paragraphs": paras})

        if path.startswith("/files/slides/"):
            name = path.rsplit("/", 1)[-1]
            if name not in ALL_SLIDES.values():
                return self._error(HTTPStatus.NOT_FOUND, "Không có slide này")
            data = (tutor.data_dir / "slides" / name).read_bytes()
            return self._send(HTTPStatus.OK, data, "application/pdf")

        return self._error(HTTPStatus.NOT_FOUND, "Không có đường dẫn này")

    def do_POST(self):
        try:
            body = self._body()
        except (ValueError, json.JSONDecodeError) as e:
            return self._error(HTTPStatus.BAD_REQUEST, f"Body không hợp lệ: {e}")

        if self.path == "/api/ask":
            question = str(body.get("question", "")).strip()
            if not question:
                return self._error(HTTPStatus.BAD_REQUEST, "Thiếu câu hỏi")
            lecture = body.get("lecture") if body.get("lecture") in (*LECTURES, "all") else "day1"
            result = tutor.answer(
                question[:4000], lecture=lecture, section=str(body.get("section", ""))[:200],
                history=body.get("history") or [], exclude=[str(x) for x in body.get("exclude") or []][:20],
            )
            return self._json(result)

        if self.path == "/api/feedback":
            tutor.log_feedback(body)
            return self._json({"ok": True})

        return self._error(HTTPStatus.NOT_FOUND, "Không có đường dẫn này")


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--ask", help="Hỏi một câu trên terminal rồi thoát")
    parser.add_argument("--lecture", default="day1", choices=[*LECTURES, "all"])
    parser.add_argument("--no-llm", action="store_true", help="Tắt AI, chỉ dùng tìm kiếm")
    args = parser.parse_args()

    load_dotenv()
    global tutor
    llm = None if args.no_llm else LLMClient.from_env()
    tutor = Tutor(find_data_dir(), llm)
    s = tutor.stats
    print(f"Data pack: {tutor.data_dir}")
    print(f"Đã nạp {s['slide_pages']} trang slide · {s['transcript_paragraphs']} đoạn transcript · {s['chat_turns']} lượt chatlog")
    print(f"AI: {' → '.join(llm.models) if llm else 'TẮT — chỉ tìm kiếm (đặt OPENAI_API_KEY hoặc GEMINI_API_KEY để bật)'}")

    if args.ask:
        result = tutor.answer(args.ask, lecture=args.lecture)
        result.pop("sources")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Mở http://{args.host}:{args.port}  (Ctrl+C để dừng)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
