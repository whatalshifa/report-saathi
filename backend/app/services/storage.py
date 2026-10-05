"""Where uploaded files live.

Locally they go in a folder. At deployment an S3 version of this class takes
over; the rest of the app only calls save() and read(), so nothing else changes.

EncryptedStorage wraps either one, so every file is encrypted before it is
written and decrypted after it is read (see crypto.py).
"""

from functools import lru_cache
from pathlib import Path
from typing import Protocol

from app.config import get_settings
from app.services.crypto import KeyWrapper, LocalKeyWrapper, decrypt, encrypt, load_master_key


class Storage(Protocol):
    def save(self, key: str, data: bytes) -> None: ...
    def read(self, key: str) -> bytes: ...
    def delete(self, key: str) -> None: ...


class LocalStorage:
    def __init__(self, root: Path):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if self.root.resolve() not in path.parents:
            raise ValueError("invalid storage key")
        return path

    def save(self, key: str, data: bytes) -> None:
        self._path(key).write_bytes(data)

    def read(self, key: str) -> bytes:
        return self._path(key).read_bytes()

    def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)


class EncryptedStorage:
    def __init__(self, inner: Storage, wrapper: KeyWrapper):
        self.inner = inner
        self.wrapper = wrapper

    def save(self, key: str, data: bytes) -> None:
        self.inner.save(key, encrypt(data, self.wrapper, context=key))

    def read(self, key: str) -> bytes:
        return decrypt(self.inner.read(key), self.wrapper, context=key)

    def delete(self, key: str) -> None:
        self.inner.delete(key)


@lru_cache
def _key_wrapper() -> KeyWrapper:
    return LocalKeyWrapper(load_master_key(get_settings()))


def get_storage() -> Storage:
    return EncryptedStorage(LocalStorage(get_settings().upload_dir), _key_wrapper())
