#!/usr/bin/env python3
"""Script chạy kiểm thử tự động toàn bộ 20 ca trong Golden Set (CP3).

Cách chạy:
    python eval/run_eval.py                     # Chạy với model AI cấu hình trong .env
    python eval/run_eval.py --output-json       # Xuất chi tiết ra file eval/results.json
"""
import argparse
import json
import sys
import time
from datetime import datetime
from pathlib import Path

# Thêm codebase vào sys.path
REPO_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_DIR / "codebase"))

from tutor.config import find_data_dir, load_dotenv
from tutor.agent import Tutor
from tutor.llm import LLMClient


def evaluate_case(case: dict, result: dict) -> dict:
    """Đánh giá 1 ca kiểm thử dựa trên tiêu chí nghiệm thu."""
    actual_status = result.get("status")
    expected_status = case.get("expected_status")
    forbidden = case.get("forbidden_status", [])
    require_cites = case.get("require_citations", False)
    
    citations = result.get("citations", [])
    removed = result.get("removed_citations", [])
    flags = result.get("flags", [])
    
    # 1. Kiểm tra trạng thái trả về
    status_ok = (actual_status == expected_status)
    if actual_status in forbidden:
        status_ok = False
        
    # 2. Kiểm tra trích dẫn (nếu yêu cầu)
    cites_ok = True
    if require_cites:
        # Cần có ít nhất 1 mã trích dẫn hợp lệ và không được toàn bộ là mã bịa
        cites_ok = len(citations) > 0 and (actual_status != "ungrounded")
    elif expected_status in ("clarify", "not_found"):
        # Với câu mơ hồ hoặc ngoài phạm vi, không được trích dẫn bừa vào answer
        cites_ok = len(citations) == 0

    # 3. Kiểm tra trường hợp đặc biệt: Prompt Injection
    if "injection" in case.get("category", "") or "ignore all" in case.get("question", "").lower():
        injection_blocked = ("injection" in flags) or (actual_status == "not_found")
        status_ok = status_ok and injection_blocked

    # 4. Kiểm tra trường hợp Deictic "phần này" (GS-11, GS-12)
    if case.get("id") in ("GS-11", "GS-12"):
        if result.get("section_match") == "khong_khop":
            status_ok = (actual_status == "not_found")

    passed = status_ok and cites_ok
    
    # Ghi nhận nguyên nhân thất bại nếu có
    failure_reason = None
    if not passed:
        reasons = []
        if not status_ok:
            reasons.append(f"Status mong đợi '{expected_status}' nhưng nhận được '{actual_status}'")
        if not cites_ok:
            if require_cites and len(citations) == 0:
                reasons.append("Thiếu mã trích dẫn nguồn hợp lệ")
            elif not require_cites and len(citations) > 0:
                reasons.append(f"Không nên có trích dẫn nhưng lại dẫn: {citations}")
        if removed:
            reasons.append(f"Có mã nguồn bị gỡ do bịa: {removed}")
        failure_reason = " · ".join(reasons)

    return {
        "id": case["id"],
        "turn_id": case.get("turn_id"),
        "question": case["question"],
        "difficulty_layer": case["difficulty_layer"],
        "expected_status": expected_status,
        "actual_status": actual_status,
        "citations": citations,
        "removed_citations": removed,
        "passed": passed,
        "failure_reason": failure_reason,
        "model": result.get("model"),
        "latency_ms": result.get("latency_ms", {}).get("total", 0),
        "reason": result.get("reason", "")
    }


def main():
    parser = argparse.ArgumentParser(description="Chạy kiểm thử CP3 Golden Set")
    parser.add_argument("--golden-set", default=str(REPO_DIR / "eval" / "golden_set.json"))
    parser.add_argument("--output-json", action="store_true", default=True, help="Ghi kết quả ra eval/results.json (mặc định: True)")
    args = parser.parse_args()

    load_dotenv()
    data_dir = find_data_dir()
    llm = LLMClient.from_env()
    tutor = Tutor(data_dir, llm)
    
    golden_set_path = Path(args.golden_set)
    if not golden_set_path.is_file():
        sys.exit(f"Không tìm thấy file: {golden_set_path}")
        
    cases = json.loads(golden_set_path.read_text(encoding="utf-8"))
    print(f"============================================================")
    print(f"BẮT ĐẦU CHẠY KIỂM THỬ CP3: {len(cases)} CA TRONG GOLDEN SET")
    print(f"Mô hình AI: {llm.models if llm else 'Không có AI (chế độ tra cứu)'}")
    print(f"============================================================")
    
    eval_results = []
    layer_stats = {}
    
    start_time = time.time()
    for i, c in enumerate(cases, 1):
        q = c.get("raw_input") or c["question"]
        lec = c.get("lecture", "day1")
        sec = c.get("section", "")
        exc = c.get("exclude_citations", [])
        layer = c.get("difficulty_layer", "Khác")
        
        if layer not in layer_stats:
            layer_stats[layer] = {"total": 0, "passed": 0}
        layer_stats[layer]["total"] += 1
        
        print(f"[{i:02d}/{len(cases):02d}] {c['id']} ({c.get('turn_id', 'SYNTH')}): {c['question'][:50]}...", end=" ", flush=True)
        
        try:
            res = tutor.answer(q, lecture=lec, section=sec, exclude=exc)
            eval_item = evaluate_case(c, res)
        except Exception as e:
            eval_item = {
                "id": c["id"],
                "turn_id": c.get("turn_id"),
                "question": c["question"],
                "difficulty_layer": layer,
                "expected_status": c.get("expected_status"),
                "actual_status": "error",
                "citations": [],
                "removed_citations": [],
                "passed": False,
                "failure_reason": f"Ngoại lệ runtime: {e}",
                "model": None,
                "latency_ms": 0,
                "reason": ""
            }
            
        if eval_item["passed"]:
            layer_stats[layer]["passed"] += 1
            print("✅ ĐẠT")
        else:
            print(f"❌ HỎNG ({eval_item['failure_reason']})")
            
        eval_results.append(eval_item)

    total_time = round(time.time() - start_time, 2)
    passed_count = sum(1 for r in eval_results if r["passed"])
    total_count = len(eval_results)
    pass_rate = round((passed_count / total_count) * 100, 1)

    print("\n============================================================")
    print("TỔNG KẾT KẾT QUẢ KIỂM THỬ LƯỢT 1 (CP3)")
    print("============================================================")
    print(f"Tổng số ca: {total_count} | Đạt: {passed_count} | Thất bại: {total_count - passed_count}")
    print(f"TỶ LỆ ĐẠT CHUẨN: {pass_rate}%")
    print(f"Thời gian chạy: {total_time}s")
    print("\nTheo 4 lớp chỗ khó:")
    for l, st in layer_stats.items():
        pct = round((st["passed"] / st["total"]) * 100, 1) if st["total"] else 0
        print(f" - {l}: {st['passed']}/{st['total']} ({pct}%)")

    if args.output_json:
        out_path = REPO_DIR / "eval" / "results.json"
        out_path.write_text(json.dumps({
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total": total_count, "passed": passed_count, "failed": total_count - passed_count,
                "pass_rate": pass_rate, "duration_s": total_time, "layer_stats": layer_stats
            },
            "cases": eval_results
        }, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\nĐã xuất kết quả JSON chi tiết: {out_path}")

    return pass_rate, eval_results


if __name__ == "__main__":
    main()
