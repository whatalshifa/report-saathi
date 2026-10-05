"""Group reports by the person they belong to, using the name printed on them.

"Mr. Anil Sharma", "ANIL SHARMA" and "anil  sharma" all become "anil sharma".
This is deliberately simple; Phase 3 adds proper family profiles with login.
"""

import re

UNKNOWN_PERSON = "unknown"

_TITLES = {"mr", "mrs", "ms", "miss", "dr", "smt", "shri", "sri", "master", "baby", "kumari", "km", "mstr"}


def person_key(patient_name: str | None) -> str:
    if not patient_name:
        return UNKNOWN_PERSON
    words = re.sub(r"[^a-z\s]", " ", patient_name.lower()).split()
    while words and words[0] in _TITLES:
        words = words[1:]
    return " ".join(words) or UNKNOWN_PERSON
