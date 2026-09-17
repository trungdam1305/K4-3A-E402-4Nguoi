#!/usr/bin/env python3
"""Đo luồng "gợi ý theo bậc" cho đề quiz trên bộ nhãn eval/hint_set.json.

Cách chạy (ở gốc repo):
    python eval/run_hint_eval.py                 # ghi eval/hint_runs/<thời điểm>.json + eval/hint_results.md
    python eval/run_hint_eval.py --no-save

Bộ nhãn là mẫu ngẫu nhiên các lượt K4 trong mục Quiz/Ôn tập, gắn nhãn tay TRƯỚC khi viết bộ nhận diện
(expected: hint / explain / other). Chỉ lưu turn_id; câu hỏi lấy nguyên văn từ data pack.
Ca "other" chỉ kiểm bộ nhận diện (không gọi AI). Mọi số liệu do script này ghi — không sửa tay.
"""
import argparse
import hashlib
import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

REPO_DIR = Path(__file__).resolve().parent.parent
EVAL_DIR = REPO_DIR / "eval"
sys.path.insert(0, str(REPO_DIR / "codebase"))

from tutor.agent import Tutor  # noqa: E402
from tutor.catalog import quiz_route  # noqa: E402
from tutor.config import find_data_dir, load_dotenv  # noqa: E402
from tutor.corpus import split_question  # noqa: E402
from tutor.llm import LLMClient  # noqa: E402


def brief(r: dict) -> dict:
    q = r.get("quiz") or {}
    return {
        "status": r.get("status"), "level": q.get("level"), "citations": r.get("citations", []),
        "verified_quotes": [v["quote"] for v in r.get("verified_quotes", [])],
        "flags": r.get("flags", []), "concept": q.get("concept", ""), "text": q.get("text", ""),
        "guiding_question": q.get("guiding_question", ""), "answer": (r.get("answer") or "")[:600],
        "model": r.get("model"), "latency_ms": (r.get("latency_ms") or {}).get("total"), "error": r.get("error"),
    }


def run_case(tutor: Tutor, case: dict) -> dict:
    turn = tutor.turns[case["turn_id"]]
    question = turn["student_question"]
    ctx = split_question(question)
    route = quiz_route(ctx["section"], ctx["question"]) or "other"
    row = {"id": case["id"], "turn_id": case["turn_id"], "expected": case["expected"], "route": route,
           "route_ok": route == case["expected"], "steps": {}, "checks": {}}
    lecture = case["lecture"]

    if case["expected"] == "hint" and route == "hint":
        r1 = tutor.answer(question, lecture=lecture)
        history = [{"role": "user", "text": r1["question"]}, {"role": "assistant", "text": r1["answer"]}]
        r2 = tutor.answer(question, lecture=lecture, hint_level=2, history=history)
        r3 = tutor.answer(question, lecture=lecture, hint_level=3)
        row["steps"] = {"bac1": brief(r1), "bac2": brief(r2), "giai_thich": brief(r3)}
        row["checks"] = {
            "bac1_co_nguon": r1["status"] == "hint" and (r1.get("quiz") or {}).get("level") == 1 and bool(r1["citations"]),
            "bac2_co_cau_trich": r2["status"] == "hint" and bool(r2["verified_quotes"]),
            "giai_thich_co_nguon": r3["status"] == "answer" and bool(r3["citations"]),
        }
        row["leak_blocked"] = sum("hint_leak_blocked" in r["flags"] for r in (r1, r2))
    elif case["expected"] == "explain" and route == "explain":
        r = tutor.answer(question, lecture=lecture)
        row["steps"] = {"giai_thich": brief(r)}
        row["checks"] = {"giai_thich_co_nguon": r["status"] == "answer" and bool(r["citations"])
                         and (r.get("quiz") or {}).get("mode") == "explain"}
    row["passed"] = row["route_ok"] and all(row["checks"].values())
    return row


def summarize(rows: list, golden_false: list) -> dict:
    hint_rows = [r for r in rows if r["expected"] == "hint"]
    ran = [r for r in hint_rows if r["steps"]]
    lat = {k: sorted(r["steps"][k]["latency_ms"] for r in ran if r["steps"][k]["latency_ms"])
           for k in ("bac1", "bac2", "giai_thich")}
    return {
        "total": len(rows), "passed": sum(r["passed"] for r in rows),
        "route_ok": sum(r["route_ok"] for r in rows),
        "hint_expected": len(hint_rows), "hint_detected": len(ran),
        "hint_predicted": sum(r["route"] == "hint" for r in rows),
        "hint_predicted_correct": sum(r["route"] == "hint" and r["expected"] == "hint" for r in rows),
        "bac1_ok": sum(r["checks"].get("bac1_co_nguon", False) for r in ran),
        "bac2_ok": sum(r["checks"].get("bac2_co_cau_trich", False) for r in ran),
        "giai_thich_ok": sum(r["checks"].get("giai_thich_co_nguon", False) for r in rows if r["steps"]),
        "giai_thich_total": sum(1 for r in rows if r["steps"]),
        "leak_blocked": sum(r.get("leak_blocked", 0) for r in rows),
        "median_latency_ms": {k: (v[len(v) // 2] if v else None) for k, v in lat.items()},
        "golden_false_triggers": golden_false,
    }


def render_markdown(run: dict) -> str:
    s = run["summary"]
    ml = s["median_latency_ms"]
    lines = [
        "# Kết quả đo luồng gợi ý theo bậc (đề quiz)",
        "",
        f"_Tự sinh bởi `eval/run_hint_eval.py` — {run['timestamp']}, commit `{run['git_commit']}`, "
        f"bộ nhãn sha1 `{run['hint_set_sha1'][:10]}`. Không sửa tay._",
        "",
        "Bộ nhãn (`eval/hint_set.json`) là 20 lượt K4 ngẫu nhiên trong mục Quiz/Ôn tập, gắn nhãn tay trước khi viết "
        "bộ nhận diện. Ca `other` chỉ kiểm bộ nhận diện, không gọi AI. Nội dung từng bậc gợi ý nằm trong file lượt chạy "
        "để người đọc lại kiểm tay xem có lộ đáp án không.",
        "",
        "| Thước đo | Kết quả |",
        "|---|---|",
        f"| Đạt toàn bộ ca | **{s['passed']}/{s['total']}** |",
        f"| Bộ nhận diện đúng nhãn | {s['route_ok']}/{s['total']} |",
        f"| Đề cần gợi ý được nhận ra | {s['hint_detected']}/{s['hint_expected']} |",
        f"| Dự đoán \"gợi ý\" đúng | {s['hint_predicted_correct']}/{s['hint_predicted']} |",
        f"| Bậc 1 có nguồn hợp lệ | {s['bac1_ok']}/{s['hint_detected']} |",
        f"| Bậc 2 có câu trích khớp nguyên văn | {s['bac2_ok']}/{s['hint_detected']} |",
        f"| Giải thích (bậc 3 / đề đã có đáp án) có nguồn | {s['giai_thich_ok']}/{s['giai_thich_total']} |",
        f"| Gợi ý lộ đáp án bị code gỡ | {s['leak_blocked']} |",
        f"| Độ trễ trung vị bậc 1 / bậc 2 / giải thích | {ml['bac1']} / {ml['bac2']} / {ml['giai_thich']} ms |",
        f"| Ca golden set bị bắt nhầm thành đề quiz | {len(s['golden_false_triggers'])} |",
        "",
        "| Ca | Turn | Nhãn | Nhận diện | Bậc 1 | Bậc 2 | Giải thích | Kết quả |",
        "|---|---|---|---|---|---|---|---|",
    ]
    mark = lambda v: "—" if v is None else ("✅" if v else "❌")
    for r in run["cases"]:
        c = r["checks"]
        lines.append(f"| {r['id']} | `{r['turn_id']}` | {r['expected']} | {r['route']} | {mark(c.get('bac1_co_nguon'))} "
                     f"| {mark(c.get('bac2_co_cau_trich'))} | {mark(c.get('giai_thich_co_nguon'))} "
                     f"| {'✅ Đạt' if r['passed'] else '❌'} |")
    return "\n".join(lines) + "\n"


def git_commit() -> str:
    def git(*args):
        return subprocess.run(["git", *args], cwd=REPO_DIR, capture_output=True, text=True, check=True).stdout.strip()
    try:
        dirty = git("status", "--porcelain", "--", "codebase", "eval/hint_set.json", "eval/run_hint_eval.py")
        return git("rev-parse", "--short", "HEAD") + ("-dirty" if dirty else "")
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Đo luồng gợi ý theo bậc")
    parser.add_argument("--no-save", action="store_true")
    args = parser.parse_args()

    load_dotenv()
    llm = LLMClient.from_env()
    if llm is None:
        sys.exit("Chưa có OPENAI_API_KEY/GEMINI_API_KEY — không đo được.")
    tutor = Tutor(find_data_dir(), llm)
    raw_bytes = (EVAL_DIR / "hint_set.json").read_bytes()
    cases = json.loads(raw_bytes.decode("utf-8"))

    golden_false = []
    for g in json.loads((EVAL_DIR / "golden_set.json").read_text(encoding="utf-8")):
        turn = tutor.turns.get(g.get("turn_id") or "")
        if turn:
            ctx = split_question(turn["student_question"])
            if quiz_route(g.get("section") or ctx["section"], ctx["question"]):
                golden_false.append(g["id"])

    rows, started = [], time.time()
    for i, case in enumerate(cases, 1):
        print(f"[{i:02d}/{len(cases)}] {case['id']} ({case['turn_id']}) nhãn {case['expected']}…", end=" ", flush=True)
        row = run_case(tutor, case)
        rows.append(row)
        print("✅" if row["passed"] else f"❌ nhận diện={row['route']} {row['checks']}")

    now = datetime.now()
    run = {"timestamp": now.isoformat(timespec="seconds"), "git_commit": git_commit(),
           "hint_set_sha1": hashlib.sha1(raw_bytes).hexdigest(), "duration_s": round(time.time() - started, 1),
           "models": llm.models, "summary": summarize(rows, golden_false), "cases": rows}
    s = run["summary"]
    print(f"\nĐạt {s['passed']}/{s['total']} · nhận diện {s['route_ok']}/{s['total']} · bậc 1 {s['bac1_ok']}/{s['hint_detected']}"
          f" · bậc 2 {s['bac2_ok']}/{s['hint_detected']} · giải thích {s['giai_thich_ok']}/{s['giai_thich_total']}"
          f" · gỡ lộ đáp án {s['leak_blocked']} · golden bắt nhầm {golden_false or 0}")
    if not args.no_save:
        (EVAL_DIR / "hint_runs").mkdir(exist_ok=True)
        path = EVAL_DIR / "hint_runs" / f"{now:%Y%m%d-%H%M%S}.json"
        path.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (EVAL_DIR / "hint_results.md").write_text(render_markdown(run), encoding="utf-8")
        print(f"Đã ghi {path.relative_to(REPO_DIR)}, eval/hint_results.md")


if __name__ == "__main__":
    main()
