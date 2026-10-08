"""Where each value sits on a PDF that has real text in it, found without the AI.

Most lab PDFs are made by the lab's software, so every printed character is in the file with its
exact position. pdfplumber reads those positions. For each value Claude read, we look for the
test's printed name and, on the same line, the value exactly as Claude copied it. Only a match
we're sure of counts: the value must be the first result after the name, and the name and value
must be found together on exactly one line in the whole file. Anything less leaves the box as it
was, because a wrong highlight is worse than none.

Scanned PDFs (photos of paper) have no text layer, so nothing is found and Claude's box stays.
The same library draws a PDF page as an image, so the page can be shown with the value marked.
"""

import io
import logging
import re
from collections.abc import Sequence

import pdfplumber

from app.services.extraction import ExtractedTest, SourceBox, clean_box

log = logging.getLogger(__name__)

# Lab reports run to a few pages; a very long PDF isn't searched (or drawn) past this.
MAX_PAGES = 50
# A little room around the printed value, in points (1/72 inch), so the highlight doesn't touch it.
PAD = 1.5
# Sharp enough to read small print when zoomed, small enough to load quickly on a phone.
PAGE_DPI = 150

Word = dict  # pdfplumber's word: text, x0, x1, top, bottom


def _norm(text: str) -> str:
    """Lowercase letters and digits only, one space apart: "Haemoglobin (Hb)" -> "haemoglobin hb"."""
    return " ".join(re.findall(r"[a-z0-9]+", text.lower()))


def _lines(words: list[Word]) -> list[list[Word]]:
    """The page's words grouped into printed lines, each read left to right."""
    lines: list[list[Word]] = []
    for word in sorted(words, key=lambda w: (w["top"], w["x0"])):
        middle = (word["top"] + word["bottom"]) / 2
        last = lines[-1] if lines else None
        if (
            last
            and abs(middle - (last[0]["top"] + last[0]["bottom"]) / 2) <= (word["bottom"] - word["top"]) / 2
        ):
            last.append(word)
        else:
            lines.append([word])
    return [sorted(line, key=lambda w: w["x0"]) for line in lines]


def _value_on_line(line: list[Word], name: str, value: list[str]) -> list[Word] | None:
    """The value's words, if the line prints the test's name and then this value as its first result."""
    # Where the name ends: the first point at which the words so far contain it.
    end = next(
        (
            k
            for k in range(1, len(line) + 1)
            if f" {name} " in f" {_norm(' '.join(w['text'] for w in line[:k]))} "
        ),
        None,
    )
    if end is None:
        return None
    is_number = any(ch.isdigit() for ch in "".join(value))
    for start in range(end, len(line) - len(value) + 1):
        if [w["text"] for w in line[start : start + len(value)]] == value:
            return line[start : start + len(value)]
        # Another result came first: a number before a number, or a word before a word (the range,
        # say "13.0 - 17.0" or "Negative"). Then the AI's reading isn't what's printed here.
        between = line[start]["text"]
        if any(ch.isdigit() for ch in between) or (not is_number and any(ch.isalpha() for ch in between)):
            return None
    return None


def _box(page, words: list[Word], number: int) -> SourceBox | None:
    left, top = page.bbox[0], page.bbox[1]
    return clean_box(
        SourceBox(
            page=number,
            x0=(min(w["x0"] for w in words) - left - PAD) / page.width,
            y0=(min(w["top"] for w in words) - top - PAD) / page.height,
            x1=(max(w["x1"] for w in words) - left + PAD) / page.width,
            y1=(max(w["bottom"] for w in words) - top + PAD) / page.height,
        )
    )


def locate_values(data: bytes, tests: Sequence[ExtractedTest]) -> list[SourceBox | None]:
    """A box for each test whose name and value are found together on exactly one line, else None."""
    found: list[list[SourceBox | None]] = [[] for _ in tests]
    wanted = [(_norm(t.name), t.value_text.split()) for t in tests]
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for number, page in enumerate(pdf.pages[:MAX_PAGES], start=1):
                # A turned page's words are measured before the turn; skip rather than risk it.
                if page.rotation % 360:
                    continue
                for line in _lines(page.extract_words()):
                    for i, (name, value) in enumerate(wanted):
                        if name and value and (words := _value_on_line(line, name, value)):
                            found[i].append(_box(page, words, number))
    except Exception as exc:
        # A damaged or unusual PDF: Claude's own boxes are still there. Only the error's kind is
        # logged, since a message could quote the report.
        log.warning("Could not read the text layer of a PDF: %s", type(exc).__name__)
        return [None] * len(tests)
    return [boxes[0] if len(boxes) == 1 else None for boxes in found]


def add_pdf_boxes(data: bytes, tests: Sequence[ExtractedTest]) -> None:
    """Puts a box from the PDF's own text on every value it can be sure of.

    An exact match from the text layer replaces the box Claude estimated, which is only ever
    approximate; values with no sure match keep Claude's box, or none.
    """
    for test, box in zip(tests, locate_values(data, tests), strict=True):
        if box is not None:
            test.box = box


def render_page(data: bytes, number: int) -> bytes | None:
    """One page of a PDF as a PNG, or None if the PDF has no such page or can't be drawn."""
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            if not 1 <= number <= min(len(pdf.pages), MAX_PAGES):
                return None
            image = pdf.pages[number - 1].to_image(resolution=PAGE_DPI).original
            out = io.BytesIO()
            image.convert("RGB").save(out, format="PNG", optimize=True)
            return out.getvalue()
    except Exception as exc:
        log.warning("Could not draw a page of a PDF: %s", type(exc).__name__)
        return None
