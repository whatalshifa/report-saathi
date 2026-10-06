"""Consent before the first upload, as India's DPDP Act 2023 asks for.

The web app shows a short notice (what is kept, that files are encrypted, that Claude reads
them when the AI is on, that everything can be downloaded or deleted) and records which
version the person agreed to. When the notice changes in a way that matters, the version
goes up and everyone is asked again on their next upload.
"""

from datetime import UTC, datetime

from app.models import User

# Must match CONSENT_VERSION in frontend/src/components/ConsentDialog.tsx, the text it stands for.
CONSENT_VERSION = "2026-10-06"

NEEDS_CONSENT = "Please agree to how we look after your reports before uploading one."


def has_consented(user: User) -> bool:
    return user.consent_version == CONSENT_VERSION


def record_consent(user: User) -> None:
    user.consent_version = CONSENT_VERSION
    user.consented_at = datetime.now(UTC)
