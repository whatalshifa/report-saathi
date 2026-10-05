"""Compare the name printed on a report with the profile it was uploaded to.

Reports are filed under the profile the user picks, not by the printed name.
But uploading Mummy's report into Papa's profile is an easy slip, so the
results page warns when the first name printed on the report isn't in the
profile's name. Family members usually share a surname, so the surname alone
doesn't count as a match.

"Mr. Anil Sharma", "ANIL SHARMA" and "anil  sharma" all become "anil sharma".
"""

import re

_TITLES = {"mr", "mrs", "ms", "miss", "dr", "smt", "shri", "sri", "master", "baby", "kumari", "km", "mstr"}


def normalize_name(name: str | None) -> str:
    words = re.sub(r"[^a-z\s]", " ", (name or "").lower()).split()
    while words and words[0] in _TITLES:
        words = words[1:]
    return " ".join(words)


def names_match(profile_name: str, printed_name: str | None) -> bool | None:
    """True or False, or None when the report has no name on it to compare."""
    printed = normalize_name(printed_name).split()
    if not printed:
        return None
    given, profile = printed[0], normalize_name(profile_name).split()
    if len(given) == 1:  # an initial, as in "A. Sharma"
        return bool(profile) and profile[0].startswith(given)
    return given in profile
