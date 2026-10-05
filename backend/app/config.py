"""All settings in one place, read from environment variables (or a .env file).

Nothing secret is hard-coded: the Anthropic API key and the database URL come
from the environment, so the same code runs on a laptop and on AWS.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="RS_", extra="ignore")

    # "production" turns on secure cookies and refuses to start without a real encryption key.
    env: Literal["development", "production"] = "development"

    # SQLite for local development; Postgres (RDS) in production.
    database_url: str = "sqlite:///./reportsaathi.db"

    # Where uploaded files are kept locally. In production this becomes S3.
    upload_dir: Path = Path("./uploads")
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

    # How long a login lasts, and how many wrong passwords lock an account for a while.
    session_days: int = 30
    max_failed_logins: int = 5
    lockout_minutes: int = 15

    @property
    def cookie_secure(self) -> bool:
        return self.env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
