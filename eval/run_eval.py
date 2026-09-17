#!/usr/bin/env python3
"""Chạy toàn bộ Golden Set qua pipeline thật của prototype và ghi kết quả.

Cách chạy (ở gốc repo):
    python eval/run_eval.py                    # chạy, ghi eval/results.json + eval/runs/<thời điểm>.json
    python eval/run_eval.py --label "Run 2"    # đặt tên lượt chạy
    python eval/run_eval.py --no-save          # chỉ in ra màn hình

Mọi số liệu trong results.json, runs/ và bảng tự động trong run_results.md đều do script này ghi —
không sửa tay. Ca có turn_id thật lấy nguyên văn câu hỏi từ data pack (golden set chỉ lưu turn_id).
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
from tutor.config import find_data_dir, load_dotenv  # noqa: E402
from tutor.llm import LLMClient  # noqa: E402

AUTO_START, AUTO_END = "<!-- AUTO:START -->", "<!-- AUTO:END -->"


def evaluate_case(case: dict, result: dict) -> dict:
    """Chấm 1 ca theo tiêu chí trong golden set."""
    actual = result.get("status")
    expected = case.get("expected_status")
    accepted = case.get("accepted_status") or [expected]
    citations = result.get("citations", [])
    removed = result.get("removed_citations", [])
    flags = result.get("flags", [])

    reasons = []
    if actual not in accepted or actual in case.get("forbidden_status", []):
        reasons.append(f"Trạng thái mong đợi {'/'.join(accepted)} nhưng nhận {actual}")
    if case.get("require_citations") and not citations:
        reasons.append("Thiếu mã nguồn hợp lệ")
    if not case.get("require_citations") and actual != "answer" and citations:
        reasons.append(f"Không nên dẫn nguồn nhưng lại dẫn {citations}")
    leaked = sorted(set(citations) & set(case.get("must_not_cite", [])))
    if leaked:
        reasons.append(f"Dẫn lại nguồn đã bị báo sai {leaked}")
    if case.get("check_injection") and "injection" not in flags:
        reasons.append("Không bật cờ injection")

    return {
        "id": case["id"],
        "turn_id": case.get("turn_id"),
        "question": case["question"],
        "difficulty_layer": case["difficulty_layer"],
        "expected_status": expected,
        "accepted_status": accepted,
        "actual_status": actual,
        "section_match": result.get("section_match"),
        "flags": flags,
        "citations": citations,
        "removed_citations": removed,
        "mode": result.get("mode"),
        "verified_quotes": result.get("verified_quotes", []),
        "quote_grounding_rate": result.get("quote_grounding_rate"),
        "passed": not reasons,
        "failure_reason": " · ".join(reasons) or None,
        "model": result.get("model"),
        "latency_ms": (result.get("latency_ms") or {}).get("total", 0),
        "answer": (result.get("answer") or "")[:400],
        "reason": result.get("reason", ""),
        "error": result.get("error"),
    }


def summarize(rows: list, duration_s: float) -> dict:
    layers = {}
    for r in rows:
        st = layers.setdefault(r["difficulty_layer"], {"total": 0, "passed": 0})
        st["total"] += 1
        st["passed"] += r["passed"]
    for st in layers.values():
        st["failed"] = st["total"] - st["passed"]
        st["pass_rate"] = round(100 * st["passed"] / st["total"], 1)
    passed = sum(r["passed"] for r in rows)
    latencies = sorted(r["latency_ms"] for r in rows if r["latency_ms"])
    # Tỷ lệ nguồn được dẫn có câu trích khớp nguyên văn, chỉ tính trên các ca có dẫn nguồn.
    quote_rates = [r["quote_grounding_rate"] for r in rows if r.get("quote_grounding_rate") is not None]
    avg_quote_rate = round(100 * sum(quote_rates) / len(quote_rates), 1) if quote_rates else None
    # Ca quyết định bằng luật (không gọi AI) báo riêng với ca do AI trả lời.
    by_rule = [r for r in rows if r.get("mode") in ("rule", "catalog_rule")]
    by_ai = [r for r in rows if r not in by_rule]
    return {
        "total": len(rows), "passed": passed, "failed": len(rows) - passed,
        "pass_rate": round(100 * passed / len(rows), 1) if rows else 0,
        "duration_s": duration_s,
        "median_latency_ms": latencies[len(latencies) // 2] if latencies else None,
        "removed_citations_total": sum(len(r["removed_citations"]) for r in rows),
        "avg_quote_rate": avg_quote_rate,
        "quote_rate_cases": len(quote_rates),
        "rule_cases": len(by_rule), "rule_passed": sum(r["passed"] for r in by_rule),
        "ai_cases": len(by_ai), "ai_passed": sum(r["passed"] for r in by_ai),
        "errors": sum(1 for r in rows if r["actual_status"] in ("error", None) or r["error"]),
        "models": sorted({r["model"] for r in rows if r["model"]}),
        "layer_stats": layers,
    }


def render_markdown(run: dict) -> str:
    s = run["summary"]
    lines = [
        f"_Tự sinh bởi `eval/run_eval.py` — lượt **{run['label']}**, {run['timestamp']}, "
        f"commit `{run['git_commit']}`, golden set sha1 `{run['golden_set_sha1'][:10]}`._",
        "",
        "| Thước đo | Kết quả |",
        "|---|---|",
        f"| Số ca | {s['total']} |",
        f"| Đạt | **{s['passed']}/{s['total']} ({s['pass_rate']}%)** |",
        f"| Model trả lời | {', '.join(s['models']) or '—'} |",
        f"| Độ trễ trung vị / lượt | {s['median_latency_ms']} ms |",
        f"| Ca do AI quyết định | {s['ai_passed']}/{s['ai_cases']} đạt |",
        f"| Ca do luật quyết định (không gọi AI) | {s['rule_passed']}/{s['rule_cases']} đạt |",
        f"| Nguồn được dẫn có câu trích khớp nguyên văn (kiểm bằng code) | "
        f"{'—' if s['avg_quote_rate'] is None else str(s['avg_quote_rate']) + '%'} "
        f"(trung bình trên {s['quote_rate_cases']} ca có dẫn nguồn) |",
        f"| Mã nguồn bịa bị bộ kiểm gỡ | {s['removed_citations_total']} |",
        f"| Lỗi gọi AI | {s['errors']} |",
        "",
        "| Lớp chỗ khó | Đạt |",
        "|---|---|",
    ]
    lines += [f"| {k} | {v['passed']}/{v['total']} ({v['pass_rate']}%) |" for k, v in s["layer_stats"].items()]
    lines += ["", "| Ca | Turn | Kỳ vọng | Thực tế | Nguồn dẫn | Kết quả |", "|---|---|---|---|---|---|"]
    for r in run["cases"]:
        verdict = "✅ Đạt" if r["passed"] else f"❌ {r['failure_reason']}"
        cites = ", ".join(f"`{c}`" for c in r["citations"]) or "—"
        lines.append(f"| {r['id']} | `{r['turn_id']}` | {'/'.join(r['accepted_status'])} "
                     f"| {r['actual_status']} | {cites} | {verdict} |")
    return "\n".join(lines)


def update_report(run: dict):
    path = EVAL_DIR / "run_results.md"
    block = f"{AUTO_START}\n{render_markdown(run)}\n{AUTO_END}"
    text = path.read_text(encoding="utf-8") if path.is_file() else f"# Kết quả kiểm thử Golden Set\n\n{AUTO_START}\n{AUTO_END}\n"
    if AUTO_START in text and AUTO_END in text:
        head, rest = text.split(AUTO_START, 1)
        text = head + block + rest.split(AUTO_END, 1)[1]
    else:
        text = text.rstrip() + "\n\n" + block + "\n"
    path.write_text(text, encoding="utf-8")


def git_commit() -> str:
    """Commit đang chạy; thêm '-dirty' nếu code/golden set có thay đổi chưa commit."""
    def git(*args):
        return subprocess.run(["git", *args], cwd=REPO_DIR, capture_output=True, text=True, check=True).stdout.strip()
    try:
        dirty = git("status", "--porcelain", "--", "codebase", "eval/golden_set.json", "eval/run_eval.py")
        return git("rev-parse", "--short", "HEAD") + ("-dirty" if dirty else "")
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Chạy Golden Set qua pipeline thật")
    parser.add_argument("--golden-set", default=str(EVAL_DIR / "golden_set.json"))
    parser.add_argument("--label", default="", help="Tên lượt chạy, vd. 'Run 2 (CP4)'")
    parser.add_argument("--no-save", action="store_true", help="Không ghi file kết quả")
    args = parser.parse_args()

    load_dotenv()
    llm = LLMClient.from_env()
    if llm is None:
        sys.exit("Chưa có OPENAI_API_KEY/GEMINI_API_KEY — không đo được (chế độ tìm kiếm không phải AI).")
    tutor = Tutor(find_data_dir(), llm)

    golden_path = Path(args.golden_set)
    raw_bytes = golden_path.read_bytes()
    cases = json.loads(raw_bytes.decode("utf-8"))
    print(f"Golden set: {len(cases)} ca · model: {' → '.join(llm.models)}")

    rows, started = [], time.time()
    for i, c in enumerate(cases, 1):
        turn = tutor.turns.get(c.get("turn_id") or "")
        question = turn["student_question"] if turn else (c.get("raw_input") or c["question"])
        print(f"[{i:02d}/{len(cases)}] {c['id']} ({c.get('turn_id')}) {c['question'][:45]}…", end=" ", flush=True)
        try:
            res = tutor.answer(question, lecture=c.get("lecture", "day1"), section=c.get("section", ""),
                               exclude=c.get("exclude_citations", []))
        except Exception as e:  # ghi lỗi vào kết quả, không dừng cả lượt
            res = {"status": "error", "error": f"{type(e).__name__}: {e}"}
        row = evaluate_case(c, res)
        rows.append(row)
        print("✅" if row["passed"] else f"❌ {row['failure_reason']}")

    now = datetime.now()
    run = {
        "label": args.label or f"Run {now:%d/%m %H:%M}",
        "timestamp": now.isoformat(timespec="seconds"),
        "git_commit": git_commit(),
        "golden_set_sha1": hashlib.sha1(raw_bytes).hexdigest(),
        "summary": summarize(rows, round(time.time() - started, 1)),
        "cases": rows,
    }
    s = run["summary"]
    print(f"\nĐạt {s['passed']}/{s['total']} ({s['pass_rate']}%) · trung vị {s['median_latency_ms']} ms · "
          f"mã bịa bị gỡ {s['removed_citations_total']} · lỗi AI {s['errors']}")
    for k, v in s["layer_stats"].items():
        print(f"  {k}: {v['passed']}/{v['total']} ({v['pass_rate']}%)")

    if not args.no_save:
        (EVAL_DIR / "runs").mkdir(exist_ok=True)
        payload = json.dumps(run, ensure_ascii=False, indent=2) + "\n"
        run_file = EVAL_DIR / "runs" / f"{now:%Y%m%d-%H%M%S}.json"
        run_file.write_text(payload, encoding="utf-8")
        (EVAL_DIR / "results.json").write_text(payload, encoding="utf-8")
        update_report(run)
        print(f"Đã ghi {run_file.relative_to(REPO_DIR)}, eval/results.json, eval/run_results.md")


if __name__ == "__main__":
    main()
