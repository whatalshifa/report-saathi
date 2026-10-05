"""Check what we send to Claude and how we handle its replies, without calling the real API."""

from types import SimpleNamespace

import pytest

from app.services.extraction import ClaudeExtractor, ExtractionError
from tests.conftest import sample_report


class FakeStream:
    def __init__(self, message):
        self.message = message

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def get_final_message(self):
        return self.message


class FakeClient:
    def __init__(self, message):
        self.requests: list[dict] = []
        self.beta = SimpleNamespace(messages=SimpleNamespace(stream=self._stream))
        self.message = message

    def _stream(self, **kwargs):
        self.requests.append(kwargs)
        return FakeStream(self.message)


def reply(stop_reason="end_turn", parsed=None):
    return SimpleNamespace(stop_reason=stop_reason, parsed_output=parsed)


def test_sends_pdf_as_document_and_returns_parsed_report():
    parsed = sample_report()
    client = FakeClient(reply(parsed=parsed))
    assert ClaudeExtractor(client).extract(b"%PDF-1.4", "application/pdf") == parsed

    request = client.requests[0]
    assert request["model"] == "claude-opus-5-5"
    assert request["output_format"].__name__ == "ExtractedReport"
    assert request["fallbacks"] == "default"
    file_block = request["messages"][0]["content"][0]
    assert file_block["type"] == "document"
    assert file_block["source"]["media_type"] == "application/pdf"


def test_sends_photo_as_image():
    client = FakeClient(reply(parsed=sample_report()))
    ClaudeExtractor(client).extract(b"\xff\xd8\xff", "image/jpeg")
    assert client.requests[0]["messages"][0]["content"][0]["type"] == "image"


@pytest.mark.parametrize(
    ("message", "error"),
    [
        (reply(stop_reason="refusal"), "declined"),
        (reply(stop_reason="max_tokens"), "too long"),
        (reply(parsed=None), "could not be understood"),
    ],
)
def test_bad_replies_become_friendly_errors(message, error):
    with pytest.raises(ExtractionError, match=error):
        ClaudeExtractor(FakeClient(message)).extract(b"%PDF", "application/pdf")
