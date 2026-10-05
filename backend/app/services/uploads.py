"""Check uploaded files before we keep them.

We look at the file's first bytes rather than trusting its name or the
browser's label, so a renamed .exe can never pass as a PDF.
"""

import io

from PIL import Image

# Claude accepts images up to 5 MB; phone photos are often bigger.
MAX_IMAGE_BYTES = 4_500_000
MAX_IMAGE_EDGE = 2400


class UploadError(Exception):
    pass


def detect_type(data: bytes) -> str:
    if data.startswith(b"%PDF-"):
        return "application/pdf"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data[4:12] in (b"ftypheic", b"ftypheix", b"ftypmif1"):
        raise UploadError("iPhone HEIC photos aren't supported yet. Please share the photo as JPG.")
    raise UploadError("Please upload a PDF, JPG, PNG or WEBP file.")


def shrink_image(data: bytes) -> tuple[bytes, str]:
    """Resize a large photo so it fits Claude's limit while keeping text readable."""
    with Image.open(io.BytesIO(data)) as image:
        image = image.convert("RGB")
        image.thumbnail((MAX_IMAGE_EDGE, MAX_IMAGE_EDGE))
        out = io.BytesIO()
        image.save(out, format="JPEG", quality=88, optimize=True)
    return out.getvalue(), "image/jpeg"


def prepare_upload(data: bytes, max_bytes: int) -> tuple[bytes, str]:
    if not data:
        raise UploadError("The file is empty.")
    if len(data) > max_bytes:
        raise UploadError(f"The file is larger than {max_bytes // 1_000_000} MB.")
    content_type = detect_type(data)
    if content_type != "application/pdf" and len(data) > MAX_IMAGE_BYTES:
        data, content_type = shrink_image(data)
    return data, content_type
