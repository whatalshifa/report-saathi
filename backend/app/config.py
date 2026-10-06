"""All settings in one place, read from environment variables (or a .env file).

Nothing secret is hard-coded: the Anthropic API key and the database URL come
from the environment, so the same code runs on a laptop and on AWS.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="RS_", extra="ignore")

    # "production" turns on secure cookies and refuses to start without a real encryption key.
    env: Literal["development", "production"] = "development"

    # SQLite for local development; Postgres (RDS) in production.
    database_url: str = "sqlite:///./reportsaathi.db"

    # Where uploaded files are kept: a local folder, or any S3-compatible bucket
    # (AWS S3, Neon Object Storage, Cloudflare R2). S3 credentials come from the standard
    # AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY variables, or the server's IAM role on AWS.
    storage: Literal["local", "s3"] = "local"
    upload_dir: Path = Path("./uploads")
    s3_bucket: str | None = None
    s3_endpoint_url: str | None = None  # leave empty for AWS S3
    s3_region: str | None = None
    max_upload_mb: int = 20

    # Read from ANTHROPIC_API_KEY (no RS_ prefix), the name every Anthropic tool uses.
    anthropic_api_key: str | None = Field(default=None, validation_alias="ANTHROPIC_API_KEY")

    # Which Claude model reads the reports, and how hard it thinks.
    claude_model: str = "claude-opus-5-5"
    claude_effort: str = "medium"

    # The web app's address, so the browser is allowed to call this API.
    cors_origins: list[str] = ["http://localhost:3000"]

    # Encrypts every uploaded file: 32 random bytes, base64-encoded. See docs/ARCHITECTURE.md.
    # In development a key is created in master_key_file if this is empty.
    master_key: SecretStr | None = None
    master_key_file: Path = Path("./.dev-master-key")
    # On AWS, set this to a KMS key id or alias and the master key never leaves KMS.
    kms_key_id: str | None = None

    # How long a login lasts, and how many wrong passwords lock an account for a while.
    session_days: int = 30
    max_failed_logins: int = 5
    lockout_minutes: int = 15

    # One-click demo accounts: deleted after guest_hours, and they can read only a few new reports.
    guest_hours: int = 24
    guest_upload_limit: int = 3
    # Every account: new reports read per day, so a leaked login can't run up the AI bill.
    daily_upload_limit: int = 30

    # How long a link to a doctor brief works. Demo accounts' links stop when the account is deleted.
    share_days: int = 7

    # Requests allowed from one address, per window. Kept in memory, so they reset on restart.
    demo_per_ip_per_hour: int = 5
    demo_per_hour: int = 100  # all addresses together
    auth_per_ip_per_10min: int = 20
    shared_per_ip_per_10min: int = 60  # opening shared briefs, so link tokens can't be guessed at speed
    export_per_user_per_hour: int = 5  # "download all my data" decrypts every file, so it is costly

    # Error tracking. Set it to a Sentry project's DSN to have crashes reported; empty turns it off.
    sentry_dsn: str | None = None

    # Re-run reports a restart interrupted. Off when several API copies run at once.
    recover_jobs_on_start: bool = True

    @field_validator("database_url")
    @classmethod
    def _use_psycopg(cls, url: str) -> str:
        # Neon, Render and Heroku hand out "postgres://" or "postgresql://" URLs. SQLAlchemy reads
        # those as the old psycopg2 driver, so point them at psycopg 3, which is what we install.
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix) :]
        return url

    @property
    def ai_enabled(self) -> bool:
        """Without an Anthropic key the site runs as a demo: sample reports only, no new readings."""
        return bool(self.anthropic_api_key and self.anthropic_api_key.strip())

    @property
    def cookie_secure(self) -> bool:
        return self.env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
