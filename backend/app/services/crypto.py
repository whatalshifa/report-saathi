"""Envelope encryption for uploaded reports.

A lab report photo holds a name, age, phone number and health data, so files
are never written to disk (or S3) in readable form.

How it works, the same way AWS KMS and Google Cloud KMS do it:
1. Every file gets its own random 256-bit data key.
2. The file is encrypted with that data key (AES-256-GCM, which also detects tampering).
3. The data key itself is encrypted ("wrapped") with the master key, and stored
   next to the file. The master key never touches the file.

To read a file, unwrap its data key with the master key, then decrypt. Swapping
the master key holder for AWS KMS later only changes the KeyWrapper class.

Stored format:  b"RSE1" | key id length (1 byte) | key id | wrapped key length (2 bytes)
                | wrapped key | nonce (12 bytes) | ciphertext with GCM tag
"""

import base64
import logging
import os
import secrets
import struct
from pathlib import Path
from typing import Protocol

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import Settings

log = logging.getLogger(__name__)

MAGIC = b"RSE1"
NONCE_BYTES = 12


class DecryptionError(Exception):
    """The file was changed, cut short, or encrypted with a different key."""


class KeyWrapper(Protocol):
    key_id: str

    def wrap(self, data_key: bytes, context: bytes) -> bytes: ...
    def unwrap(self, wrapped: bytes, context: bytes) -> bytes: ...


class LocalKeyWrapper:
    """Wraps data keys with a master key held in an environment variable."""

    def __init__(self, master_key: bytes, key_id: str = "local-1"):
        if len(master_key) != 32:
            raise ValueError("The master key must be exactly 32 bytes")
        self._aead = AESGCM(master_key)
        self.key_id = key_id

    def wrap(self, data_key: bytes, context: bytes) -> bytes:
        nonce = os.urandom(NONCE_BYTES)
        return nonce + self._aead.encrypt(nonce, data_key, context)

    def unwrap(self, wrapped: bytes, context: bytes) -> bytes:
        try:
            return self._aead.decrypt(wrapped[:NONCE_BYTES], wrapped[NONCE_BYTES:], context)
        except (InvalidTag, ValueError) as exc:
            raise DecryptionError("The file's key could not be unwrapped") from exc


def encrypt(plaintext: bytes, wrapper: KeyWrapper, context: str) -> bytes:
    """`context` (the file's storage key) is bound in, so a file can't be swapped for another."""
    aad = context.encode()
    data_key = AESGCM.generate_key(bit_length=256)
    wrapped = wrapper.wrap(data_key, aad)
    nonce = os.urandom(NONCE_BYTES)
    ciphertext = AESGCM(data_key).encrypt(nonce, plaintext, aad)
    key_id = wrapper.key_id.encode()
    return b"".join(
        [
            MAGIC,
            struct.pack(">B", len(key_id)),
            key_id,
            struct.pack(">H", len(wrapped)),
            wrapped,
            nonce,
            ciphertext,
        ]
    )


def decrypt(blob: bytes, wrapper: KeyWrapper, context: str) -> bytes:
    aad = context.encode()
    try:
        if not blob.startswith(MAGIC):
            raise DecryptionError("This file is not encrypted in the expected format")
        pos = len(MAGIC)
        (id_len,) = struct.unpack_from(">B", blob, pos)
        key_id = blob[pos + 1 : pos + 1 + id_len].decode()
        pos += 1 + id_len
        (wrapped_len,) = struct.unpack_from(">H", blob, pos)
        wrapped = blob[pos + 2 : pos + 2 + wrapped_len]
        pos += 2 + wrapped_len
        nonce, ciphertext = blob[pos : pos + NONCE_BYTES], blob[pos + NONCE_BYTES :]
    except (struct.error, UnicodeDecodeError) as exc:
        raise DecryptionError("The file is damaged") from exc
    if key_id != wrapper.key_id:
        raise DecryptionError(f"The file was encrypted with key {key_id!r}, not {wrapper.key_id!r}")
    data_key = wrapper.unwrap(wrapped, aad)
    try:
        return AESGCM(data_key).decrypt(nonce, ciphertext, aad)
    except (InvalidTag, ValueError) as exc:
        raise DecryptionError("The file was changed after it was saved") from exc


def generate_master_key() -> str:
    return base64.b64encode(secrets.token_bytes(32)).decode()


def load_master_key(settings: Settings) -> bytes:
    """The key from RS_MASTER_KEY; in development, from (or into) a local file instead."""
    raw = settings.master_key.get_secret_value().strip() if settings.master_key else ""
    if not raw and settings.env == "production":
        raise RuntimeError("RS_MASTER_KEY must be set in production")
    if not raw:
        path: Path = settings.master_key_file
        if not path.exists():
            path.write_text(generate_master_key())
            path.chmod(0o600)
            log.warning("Created a development encryption key at %s. Keep it: files need it to open.", path)
        raw = path.read_text().strip()
    try:
        return base64.b64decode(raw, validate=True)
    except ValueError as exc:
        raise RuntimeError("RS_MASTER_KEY must be base64") from exc
