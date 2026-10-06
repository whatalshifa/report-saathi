"""One place that calls Claude and turns its reply into a checked Python object.

Every AI feature (reading reports, explaining them, writing the doctor brief)
goes through ask_structured(), so error handling, streaming and safety
fallbacks are written once.
"""

from typing import TypeVar

import anthropic
from pydantic import BaseModel

from app.config import get_settings

T = TypeVar("T", bound=BaseModel)


class AIError(Exception):
    """A failure we can explain to the user in plain words."""


AI_OFF = "The AI is switched off on this demo, so only the ready-made sample results are available."


def make_client() -> anthropic.Anthropic:
    settings = get_settings()
    if not settings.ai_enabled:
        raise AIError(AI_OFF)
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def ask_structured(
    client: anthropic.Anthropic,
    *,
    system: str,
    content: list[dict],
    output_format: type[T],
) -> T:
    settings = get_settings()
    try:
        # Streaming keeps long answers from hitting HTTP timeouts.
        with client.beta.messages.stream(
            model=settings.claude_model,
            max_tokens=64000,
            system=system,
            messages=[{"role": "user", "content": content}],
            output_format=output_format,
            output_config={"effort": settings.claude_effort},
            # If a safety check declines, the API retries on a fallback model by itself.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        ) as stream:
            message = stream.get_final_message()
    except anthropic.RateLimitError as exc:
        raise AIError("The AI service is busy right now. Please try again in a minute.") from exc
    except anthropic.APIStatusError as exc:
        raise AIError(f"The AI service returned an error ({exc.status_code}).") from exc
    except anthropic.APIConnectionError as exc:
        raise AIError("Could not reach the AI service.") from exc

    if message.stop_reason == "refusal":
        raise AIError("The AI declined this request.")
    if message.stop_reason == "max_tokens":
        raise AIError("The answer was too long to finish in one go.")
    if message.parsed_output is None:
        raise AIError("The AI reply could not be understood.")
    return message.parsed_output
