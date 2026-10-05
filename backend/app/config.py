"""All settings in one place, read from environment variables (or a .env file).

Nothing secret is hard-coded: the Anthropic API key and the database URL come
from the environment, so the same code runs on a laptop and on AWS.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="RS_", extra="ignore")

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


@lru_cache
def get_settings() -> Settings:
    return Settings()
