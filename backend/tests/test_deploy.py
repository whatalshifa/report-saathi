"""Pieces that only matter once deployed: S3, KMS, restart recovery, the health check."""

import io
import os

import pytest

from app.config import Settings
from app.models import Explanation, JobStatus, Profile, Relation, Report, ReportStatus, User
from app.services.crypto import DecryptionError, KmsKeyWrapper, decrypt, encrypt
from app.services.jobs import INTERRUPTED, recover_interrupted
from app.services.storage import EncryptedStorage, S3Storage, make_storage
from tests.conftest import PDF_BYTES, FakeExtractor, sample_report


class FakeS3:
    def __init__(self):
        self.objects: dict[tuple[str, str], bytes] = {}

    def put_object(self, Bucket, Key, Body):  # noqa: N803 - boto3's argument names
        self.objects[(Bucket, Key)] = Body

    def get_object(self, Bucket, Key):  # noqa: N803
        return {"Body": io.BytesIO(self.objects[(Bucket, Key)])}

    def delete_object(self, Bucket, Key):  # noqa: N803
        self.objects.pop((Bucket, Key), None)


class FakeKms:
    """Stands in for AWS KMS: 'encrypts' by XOR with a secret, and checks the context."""

    secret = os.urandom(32)

    def encrypt(self, KeyId, Plaintext, EncryptionContext):  # noqa: N803
        blob = bytes(a ^ b for a, b in zip(Plaintext, self.secret, strict=True))
        return {"CiphertextBlob": EncryptionContext["file"].encode() + b"|" + blob}

    def decrypt(self, KeyId, CiphertextBlob, EncryptionContext):  # noqa: N803
        context, blob = CiphertextBlob.split(b"|", 1)
        if context.decode() != EncryptionContext["file"]:
            raise RuntimeError("InvalidCiphertextException")
        return {"Plaintext": bytes(a ^ b for a, b in zip(blob, self.secret, strict=True))}


def test_s3_storage_with_encryption():
    s3 = FakeS3()
    wrapper = KmsKeyWrapper("alias/reportsaathi", FakeKms())
    storage = EncryptedStorage(S3Storage("reports", s3), wrapper)

    storage.save("a.pdf", PDF_BYTES)
    stored = s3.objects[("reports", "a.pdf")]
    assert stored.startswith(b"RSE1") and PDF_BYTES not in stored
    assert storage.read("a.pdf") == PDF_BYTES
    storage.delete("a.pdf")
    assert s3.objects == {}


def test_kms_refuses_a_swapped_file():
    wrapper = KmsKeyWrapper("alias/reportsaathi", FakeKms())
    blob = encrypt(b"data", wrapper, context="a.pdf")
    with pytest.raises(DecryptionError):
        decrypt(blob, wrapper, context="b.pdf")


def test_s3_needs_a_bucket():
    with pytest.raises(RuntimeError, match="RS_S3_BUCKET"):
        make_storage(Settings(storage="s3", s3_bucket=None))


def test_restart_finishes_interrupted_work(session_factory, storage):
    with session_factory() as session:
        user = User(email="a@example.com", name="A", password_hash="x")
        profile = Profile(user=user, name="A", relation=Relation.self)
        stuck = Report(profile=profile, filename="r.pdf", content_type="application/pdf", storage_key="r.pdf")
        done = Report(
            profile=profile,
            filename="d.pdf",
            content_type="application/pdf",
            storage_key="d.pdf",
            status=ReportStatus.done,
        )
        session.add_all([stuck, done])
        session.flush()
        session.add(Explanation(report_id=done.id, language="hi", status=JobStatus.processing))
        session.commit()
        stuck_id = stuck.id
    storage.save("r.pdf", PDF_BYTES)

    extractor = FakeExtractor(sample_report())
    assert recover_interrupted(session_factory, storage, extractor) == 1

    with session_factory() as session:
        assert session.get(Report, stuck_id).status == ReportStatus.done
        explanation = session.query(Explanation).one()
        assert (explanation.status, explanation.error) == (JobStatus.failed, INTERRUPTED)
    assert extractor.calls == ["application/pdf"]


def test_health_checks_the_database(client):
    assert client.get("/api/health").json() == {"status": "ok"}
