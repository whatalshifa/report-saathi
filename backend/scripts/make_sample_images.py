"""Draw the sample person's lab reports as page images, so "where did this number come from?" works.

Meera Joshi is made up, and so are her reports. Their values were typed into
app/samples/meera.json in advance; this script draws each report as a realistic
A4 page (lab header, patient line, sections, a results table), clearly marked as
made-up data, and saves it next to the JSON. It then writes back where each value
was drawn (the same "box" Claude returns for a real upload), so the highlight
always lands exactly on the printed number.

The PNGs are committed, so the server never needs this script or its font. Run it
again only after changing the sample values:

    cd backend && python scripts/make_sample_images.py
"""

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SAMPLES = Path(__file__).resolve().parent.parent / "app" / "samples"
DATA_FILE = SAMPLES / "meera.json"

# A4 at 150 dpi: sharp enough to read when zoomed in, small enough to keep each file light.
WIDTH, HEIGHT = 1240, 1754
MARGIN = 80

# Column left edges of the results table, and its right edge.
COL_TEST, COL_RESULT, COL_UNIT, COL_REF, COL_FLAG, COL_END = 80, 520, 670, 870, 1100, 1160

INK = (30, 34, 40)
GREY = (110, 116, 124)
RULE = (200, 204, 210)
BAND = (236, 239, 243)
WATERMARK = (247, 214, 214)
STAMP = (196, 40, 40)

# Each lab gets its own colour and address line, as real labs do.
LABS = {
    "Sample Pathology Lab, Pune": ((14, 116, 110), "12 Sample Road, Pune 411001 · Tel 020-0000 0000"),
    "Demo Diagnostics Centre, Pune": ((55, 65, 160), "Unit 4, Demo Plaza, Pune 411004 · Tel 020-1111 1111"),
}

FONT_PATHS = {
    False: ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "DejaVuSans.ttf"],
    True: ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "DejaVuSans-Bold.ttf"],
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    for path in FONT_PATHS[bold]:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    # Pillow's built-in font has no bold, but it keeps the script working anywhere.
    return ImageFont.load_default(size)


def wrap(draw: ImageDraw.ImageDraw, text: str, face, width: int) -> list[str]:
    lines, line = [], ""
    for word in text.split():
        candidate = f"{line} {word}".strip()
        if line and draw.textlength(candidate, font=face) > width:
            lines.append(line)
            line = word
        else:
            line = candidate
    return [*lines, line] if line else lines


def display_date(iso: str) -> str:
    year, month, day = iso.split("-")
    return f"{day}-{month}-{year}"


def draw_watermark(page: Image.Image) -> None:
    """A large diagonal "SAMPLE" mark behind the text: impossible to miss, never covering a value."""
    # Drawn on a square wider than the page, so the words aren't cut off before they are turned.
    side = 2000
    layer = Image.new("L", (side, side), 0)
    ImageDraw.Draw(layer).text(
        (side // 2, side // 2), "SAMPLE - made-up data", font=font(88, bold=True), fill=255, anchor="mm"
    )
    layer = layer.rotate(55, resample=Image.Resampling.BICUBIC)
    left, top = (side - WIDTH) // 2, (side - HEIGHT) // 2
    page.paste(WATERMARK, (0, 0), layer.crop((left, top, left + WIDTH, top + HEIGHT)))


def draw_report(reading: dict) -> tuple[Image.Image, list[dict]]:
    """Draws one report and returns the page with the box around each printed result, in order."""
    page = Image.new("RGB", (WIDTH, HEIGHT), "white")
    draw_watermark(page)
    draw = ImageDraw.Draw(page)
    colour, address = LABS[reading["lab_name"]]
    regular, bold, small = font(22), font(22, bold=True), font(18)

    # Lab header.
    draw.rectangle((0, 0, WIDTH, 14), fill=colour)
    draw.text((MARGIN, 52), reading["lab_name"], font=font(40, bold=True), fill=colour)
    draw.text((MARGIN, 106), address, font=small, fill=GREY)
    draw.text((WIDTH - MARGIN, 58), "LABORATORY REPORT", font=font(24, bold=True), fill=INK, anchor="ra")
    stamp = (WIDTH - MARGIN - 190, 100, WIDTH - MARGIN, 146)
    draw.rectangle(stamp, outline=STAMP, width=3)
    draw.text(((stamp[0] + stamp[2]) // 2, 123), "SAMPLE", font=font(26, bold=True), fill=STAMP, anchor="mm")
    draw.line((MARGIN, 168, WIDTH - MARGIN, 168), fill=colour, width=3)

    # Patient details, in two columns.
    date = display_date(reading["report_date"])
    details = [
        ("Patient", reading["patient_name"], "Patient ID", "SAMPLE-0001"),
        ("Age / Sex", f"{reading['patient_age']} / {reading['patient_sex']}", "Collected", date),
        ("Referred by", "Self", "Reported", date),
    ]
    y = 192
    for left_label, left, right_label, right in details:
        draw.text((MARGIN, y), f"{left_label}:", font=regular, fill=GREY)
        draw.text((MARGIN + 160, y), left, font=bold, fill=INK)
        draw.text((700, y), f"{right_label}:", font=regular, fill=GREY)
        draw.text((850, y), right, font=bold, fill=INK)
        y += 36
    draw.line((MARGIN, y + 10, WIDTH - MARGIN, y + 10), fill=RULE, width=2)

    # Table header.
    y += 34
    draw.rectangle((MARGIN, y, WIDTH - MARGIN, y + 44), fill=BAND)
    for x, label in [
        (COL_TEST, "TEST"),
        (COL_RESULT, "RESULT"),
        (COL_UNIT, "UNIT"),
        (COL_REF, "REFERENCE RANGE"),
        (COL_FLAG, "FLAG"),
    ]:
        draw.text((x + 10, y + 11), label, font=font(18, bold=True), fill=GREY)
    y += 58

    boxes, section = [], None
    for test in reading["tests"]:
        if test["section"] != section:
            section = test["section"]
            y += 6
            draw.text((COL_TEST + 10, y), section.upper(), font=font(20, bold=True), fill=colour)
            y += 32
            draw.line((COL_TEST + 10, y, COL_END - 10, y), fill=RULE, width=1)
            y += 10

        flagged = bool(test["lab_flag"])
        value_font = bold if flagged else regular
        name_lines = wrap(draw, test["name"], regular, COL_RESULT - COL_TEST - 20)
        ref_lines = wrap(draw, test["reference_text"] or "", small, COL_FLAG - COL_REF - 20)
        for i, line in enumerate(name_lines):
            draw.text((COL_TEST + 10, y + i * 28), line, font=regular, fill=INK)
        draw.text((COL_RESULT + 10, y), test["value_text"], font=value_font, fill=INK)
        draw.text((COL_UNIT + 10, y), test["unit"] or "", font=regular, fill=INK)
        for i, line in enumerate(ref_lines):
            draw.text((COL_REF + 10, y + 2 + i * 24), line, font=small, fill=INK)
        if flagged:
            draw.text((COL_FLAG + 10, y), test["lab_flag"], font=bold, fill=INK)

        # The box hugs the printed result, with a little room so the highlight frames it.
        left, top, right, bottom = draw.textbbox((COL_RESULT + 10, y), test["value_text"], font=value_font)
        boxes.append(
            {
                "page": 1,
                "x0": round((left - 8) / WIDTH, 4),
                "y0": round((top - 6) / HEIGHT, 4),
                "x1": round((right + 8) / WIDTH, 4),
                "y1": round((bottom + 6) / HEIGHT, 4),
            }
        )
        y += max(len(name_lines) * 28, len(ref_lines) * 24) + 14

    # Sign-off and footer.
    y += 24
    draw.text((WIDTH // 2, y), "--- End of report ---", font=small, fill=GREY, anchor="ma")
    draw.text((WIDTH - MARGIN, y + 70), "Dr. Sample Pathologist (made up)", font=bold, fill=INK, anchor="ra")
    draw.text((WIDTH - MARGIN, y + 102), "MD (Pathology)", font=small, fill=GREY, anchor="ra")
    if y + 140 > HEIGHT - 100:
        raise SystemExit(f"{reading['report_date']}: the report no longer fits on one page")
    draw.line((MARGIN, HEIGHT - 96, WIDTH - MARGIN, HEIGHT - 96), fill=RULE, width=2)
    draw.text(
        (WIDTH // 2, HEIGHT - 76),
        "SAMPLE - made-up data for the ReportSaathi demo. Not a real patient, lab or doctor.",
        font=small,
        fill=STAMP,
        anchor="ma",
    )
    return page, boxes


def save_small(page: Image.Image, path: Path) -> None:
    # Text on white needs only a few shades; an undithered palette keeps each page small.
    page.quantize(colors=32, dither=Image.Dither.NONE).save(path, optimize=True)


def main() -> None:
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    for item in data["reports"]:
        reading = item["reading"]
        page, boxes = draw_report(reading)
        name = f"sample-report-{reading['report_date'][:7]}.png"
        save_small(page, SAMPLES / name)
        # The sample is now a picture of a report, so its name says so.
        item["filename"] = item["image"] = name
        for test, box in zip(reading["tests"], boxes, strict=True):
            test["box"] = box
        print(f"{name}: {(SAMPLES / name).stat().st_size // 1000} KB, {len(boxes)} values")
    DATA_FILE.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
