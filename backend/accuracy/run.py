"""Run the accuracy test on real lab reports.

    1. Put report files (PDF, JPG, PNG, WEBP) in accuracy/data/. This folder is
       git-ignored: real reports never go in the repository.
    2. python -m accuracy.run draft accuracy/data
       Writes a draft answer key next to each file (<file>.label.json), filled
       in from one Claude reading so you don't type 50 reports from scratch.
    3. Open each report next to its draft and fix every value, unit and flag by
       hand, then set "reviewed": true. Check against the paper, not the draft:
       a draft that is trusted without checking only measures itself.
    4. python -m accuracy.run score accuracy/data
       Reads every reviewed report again from scratch, compares with the
       answer keys, and writes the results (counts only, no patient details)
       to accuracy/results.json, docs/RESULTS.md and the web app's results page.

Needs ANTHROPIC_API_KEY. Scoring 50 reports makes 50 Claude calls.
"""

import argparse
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from pathlib import Path

from accuracy.scoring import Predicted, score_report, summarize
from app.config import get_settings
from app.services.extraction import ClaudeExtractor, ExtractedReport
from app.services.processing import build_results
from app.services.uploads import prepare_upload

ROOT = Path(__file__).resolve().parents[2]
RESULTS_FILES = [ROOT / "backend/accuracy/results.json", ROOT / "frontend/src/data/accuracy.json"]
SUFFIXES = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}


def _reports(folder: Path) -> list[Path]:
    return sorted(p for p in folder.iterdir() if p.suffix.lower() in SUFFIXES)


def _label_path(report: Path) -> Path:
    return report.with_name(report.name + ".label.json")


def _read(extractor: ClaudeExtractor, report: Path) -> ExtractedReport:
    # The same preparation as a real upload, so photos are shrunk exactly as in the app.
    data, content_type = prepare_upload(report.read_bytes(), get_settings().max_upload_mb * 1_000_000)
    return extractor.extract(data, content_type)


def _predictions(extracted: ExtractedReport) -> list[Predicted]:
    return [
        Predicted(name=r.name, value=r.value_text, unit=r.unit, flag=r.flag.value, catalog_key=r.catalog_key)
        for r in build_results(extracted)
    ]


def draft(folder: Path) -> None:
    extractor = ClaudeExtractor()
    todo = [r for r in _reports(folder) if not _label_path(r).exists()]
    print(f"Drafting {len(todo)} answer keys…")
    for report in todo:
        extracted = _read(extractor, report)
        label = {
            "reviewed": False,
            "source": "pdf" if report.suffix.lower() == ".pdf" else "photo",
            "lab_name": extracted.lab_name,
            "report_date": extracted.report_date,
            "tests": [
                {"name": p.name, "value": p.value, "unit": p.unit, "flag": p.flag}
                for p in _predictions(extracted)
            ],
        }
        _label_path(report).write_text(json.dumps(label, indent=2, ensure_ascii=False))
        print(f"  {report.name}: {len(label['tests'])} values")
    print('Now check every draft against its report and set "reviewed": true.')


def score(folder: Path, reuse: str | None) -> None:
    reviewed = [r for r in _reports(folder) if _label_path(r).exists()]
    labels = {r: json.loads(_label_path(r).read_text()) for r in reviewed}
    reviewed = [r for r in reviewed if labels[r].get("reviewed")]
    if not reviewed:
        sys.exit('No reviewed answer keys yet. Run `draft`, check the files, and set "reviewed": true.')

    run_dir = folder / "runs" / (reuse or datetime.now(UTC).strftime("%Y%m%d-%H%M%S"))
    run_dir.mkdir(parents=True, exist_ok=True)

    def fresh_reading(report: Path) -> ExtractedReport:
        saved = run_dir / f"{report.name}.json"
        if saved.exists():
            return ExtractedReport.model_validate_json(saved.read_text())
        extracted = _read(extractor, report)
        saved.write_text(extracted.model_dump_json(indent=2))
        return extracted

    extractor = ClaudeExtractor()
    print(f"Reading {len(reviewed)} reports (saving readings in {run_dir})…")
    with ThreadPoolExecutor(max_workers=4) as pool:
        readings = list(pool.map(fresh_reading, reviewed))

    scores = [
        score_report(labels[r], _predictions(e), e.lab_name, e.report_date)
        for r, e in zip(reviewed, readings, strict=True)
    ]
    settings = get_settings()
    results = {
        "run_at": datetime.now(UTC).isoformat(timespec="minutes"),
        "model": settings.claude_model,
        "effort": settings.claude_effort,
        **summarize(scores),
    }
    for path in RESULTS_FILES:
        path.write_text(json.dumps(results, indent=2) + "\n")
    (ROOT / "docs/RESULTS.md").write_text(render_markdown(results))
    print(json.dumps(results["overall"], indent=2))


def _cell(value: float | None) -> str:
    return "–" if value is None else f"{value}%"


def render_markdown(results: dict) -> str:
    rows = [("All reports", results["overall"])] + [
        (source.upper() if source == "pdf" else source.title() + "s", block)
        for source, block in results["by_source"].items()
    ]
    columns = [
        ("Values found", "values_found_pct"),
        ("Values invented", "values_invented_pct"),
        ("Value read right", "value_correct_pct"),
        ("Unit right", "unit_correct_pct"),
        ("Flag right", "flag_correct_pct"),
        ("Lab name right", "lab_name_correct_pct"),
        ("Date right", "date_correct_pct"),
    ]
    lines = [
        "# Accuracy results",
        "",
        f"Run on {results['run_at'][:10]} with `{results['model']}` (effort `{results['effort']}`). "
        "How the test works is in [docs/ACCURACY.md](ACCURACY.md).",
        "",
        "| | Reports | Values | " + " | ".join(name for name, _ in columns) + " |",
        "|---|---|---|" + "---|" * len(columns),
    ]
    for name, block in rows:
        cells = " | ".join(_cell(block[key]) for _, key in columns)
        lines.append(f"| {name} | {block['reports']} | {block['values_on_reports']} | {cells} |")
    for title, key in [
        ("Most often missed", "most_missed"),
        ("Most often misread", "most_misread"),
        ("Most often flagged wrongly", "most_misflagged"),
    ]:
        if results[key]:
            lines += ["", f"**{title}:** " + ", ".join(f"{name} ({count})" for name, count in results[key])]
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("draft").add_argument("folder", type=Path)
    score_parser = sub.add_parser("score")
    score_parser.add_argument("folder", type=Path)
    score_parser.add_argument("--reuse", help="re-score a saved run (its folder name) without calling Claude")
    args = parser.parse_args()
    if args.command == "draft":
        draft(args.folder)
    else:
        score(args.folder, args.reuse)


if __name__ == "__main__":
    main()
