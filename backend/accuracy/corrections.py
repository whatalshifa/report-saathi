"""Turn the values people fixed in the app into test cases for the accuracy kit.

When someone corrects a value the AI misread, the app logs it (the corrections table).
This exports one case per corrected value, from what the AI first read to what the
person finally saved:

    {"test": "Haemoglobin (Hb)", "printed_value": "10.6", "printed_unit": "g/dL",
     "corrected_value": "13.6", "corrected_unit": "g/dL"}

"printed_*" is what the AI read off the report; "corrected_*" is what the person says is
printed there. Only the test name, the two values and the units leave the database: no
names, dates, labs, accounts or ids. Sample reports are left out (they were typed in by
hand, so a change there is someone trying the button, not a misreading), and so are fixes
the scoring counts as no change at all, like "2,50,000" to "250000".

    python -m accuracy.run corrections            # writes accuracy/data/corrections.json (git-ignored)
"""

import json
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from accuracy.scoring import same_unit, same_value
from app.models import Correction, Report, TestResult


def export_corrections(session: Session) -> list[dict]:
    query = (
        select(Correction, TestResult.name)
        .join(TestResult, Correction.result_id == TestResult.id)
        .join(Report, TestResult.report_id == Report.id)
        # Uploads are PDFs or images; the ready-made sample reports are the only text/plain ones.
        .where(Report.content_type != "text/plain")
        .order_by(Correction.result_id, Correction.created_at, Correction.id)
    )
    # A value may be fixed more than once (a typo in the fix); keep the first reading and the last fix.
    first: dict[int, tuple[Correction, str]] = {}
    last: dict[int, Correction] = {}
    for correction, name in session.execute(query):
        first.setdefault(correction.result_id, (correction, name))
        last[correction.result_id] = correction

    cases = []
    for result_id, (start, name) in first.items():
        end = last[result_id]
        if same_value(start.old_value_text, end.new_value_text) and same_unit(start.old_unit, end.new_unit):
            continue
        cases.append(
            {
                "test": name,
                "printed_value": start.old_value_text,
                "printed_unit": start.old_unit,
                "corrected_value": end.new_value_text,
                "corrected_unit": end.new_unit,
            }
        )
    return sorted(cases, key=lambda c: (c["test"].lower(), c["printed_value"], c["corrected_value"]))


def write_corrections(session: Session, path: Path) -> int:
    """Writes the cases as JSON to `path` and returns how many there were."""
    cases = export_corrections(session)
    path.parent.mkdir(parents=True, exist_ok=True)
    exported = {"exported_at": datetime.now(UTC).isoformat(timespec="minutes"), "cases": cases}
    path.write_text(json.dumps(exported, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return len(cases)
