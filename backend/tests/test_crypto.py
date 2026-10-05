"""Uploaded files are encrypted at rest, and any change to them is detected."""

import base64
import os

import pytest

from app.config import Settings
from app.services.crypto import DecryptionError, LocalKeyWrapper, decrypt, encrypt, load_master_key
from app.services.storage import EncryptedStorage, LocalStorage
from tests.conftest import PDF_BYTES, upload


@pytest.fixture
def wrapper():
    return LocalKeyWrapper(os.urandom(32))


def test_round_trip(wrapper):
    blob = encrypt(b"lab report bytes", wrapper, context="a.pdf")
    assert b"lab report bytes" not in blob
    assert decrypt(blob, wrapper, context="a.pdf") == b"lab report bytes"
    # Every file gets its own data key and nonce, so the same input never encrypts the same way.
    assert encrypt(b"lab report bytes", wrapper, context="a.pdf") != blob


def test_tampering_is_detected(wrapper):
    blob = bytearray(encrypt(b"Haemoglobin 13.4", wrapper, context="a.pdf"))
    blob[-5] ^= 1
    with pytest.raises(DecryptionError, match="changed"):
        decrypt(bytes(blob), wrapper, context="a.pdf")


def test_wrong_key_or_swapped_file_fails(wrapper):
    blob = encrypt(b"data", wrapper, context="a.pdf")
    with pytest.raises(DecryptionError):
        decrypt(blob, LocalKeyWrapper(os.urandom(32)), context="a.pdf")
    with pytest.raises(DecryptionError):
        decrypt(blob, LocalKeyWrapper(os.urandom(32), key_id="local-2"), context="a.pdf")
    # A file copied over another one's name is rejected too.
    with pytest.raises(DecryptionError):
        decrypt(blob, wrapper, context="b.pdf")
    for damaged in (b"", b"RSE1", blob[:20], b"%PDF-1.4 plain"):
        with pytest.raises(DecryptionError):
            decrypt(damaged, wrapper, context="a.pdf")


def test_uploaded_files_are_not_readable_on_disk(client, storage):
    report_id = upload(client).json()["id"]
    on_disk = (storage.inner.root / f"{report_id}.pdf").read_bytes()
    assert on_disk.startswith(b"RSE1")
    assert b"%PDF" not in on_disk
    assert storage.read(f"{report_id}.pdf") == PDF_BYTES


def test_encrypted_storage_wraps_any_storage(tmp_path, wrapper):
    storage = EncryptedStorage(LocalStorage(tmp_path), wrapper)
    storage.save("x.png", b"photo")
    assert storage.read("x.png") == b"photo"
    storage.delete("x.png")
    assert not (tmp_path / "x.png").exists()


def test_master_key_loading(tmp_path):
    key = base64.b64encode(os.urandom(32)).decode()
    assert len(load_master_key(Settings(master_key=key))) == 32

    # Development creates a key file once, then keeps using it.
    dev = Settings(master_key=None, master_key_file=tmp_path / "key")
    first = load_master_key(dev)
    assert load_master_key(dev) == first
    assert oct((tmp_path / "key").stat().st_mode)[-3:] == "600"

    with pytest.raises(RuntimeError, match="must be set"):
        load_master_key(Settings(env="production", master_key=""))
    with pytest.raises(RuntimeError, match="base64"):
        load_master_key(Settings(master_key="not base64!"))
    with pytest.raises(ValueError, match="32 bytes"):
        LocalKeyWrapper(b"short")
