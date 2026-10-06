import os

# Tests start their own jobs; don't let the app's restart recovery run alongside them.
os.environ.setdefault("RS_RECOVER_JOBS_ON_START", "false")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key-not-used")  # fakes stand in for Claude

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.api.auth import Limiters, get_limiters
from app.config import get_settings
from app.db import Base, get_session_factory, make_engine
from app.main import app
from app.services.crypto import LocalKeyWrapper
from app.services.extraction import ExtractedReport, ExtractedTest, get_extractor
from app.services.storage import EncryptedStorage, LocalStorage, get_storage
from app.services.writing import BriefFinding, DoctorBrief, ExplainedTest, ReportExplanation, get_writer

PDF_BYTES = b"%PDF-1.4\n% fake test pdf\n"


def make_test(
    name: str,
    value_text: str,
    unit: str | None,
    reference_text: str | None,
    *,
    section: str | None = None,
    catalog_key: str = "other",
    numeric_value: float | None = None,
    ref_low: float | None = None,
    ref_high: float | None = None,
    lab_flag: str | None = None,
) -> ExtractedTest:
    return ExtractedTest(
        section=section,
        name=name,
        catalog_key=catalog_key,
        value_text=value_text,
        numeric_value=numeric_value,
        unit=unit,
        reference_text=reference_text,
        ref_low=ref_low,
        ref_high=ref_high,
        lab_flag=lab_flag,
    )


def sample_report(**overrides) -> ExtractedReport:
    tests = [
        make_test("Haemoglobin", "11.2", "g/dL", "13.0 - 17.0", section="Complete Blood Count", lab_flag="L"),
        make_test(
            "Platelet Count", "2,50,000", "/cumm", "1,50,000 - 4,50,000", section="Complete Blood Count"
        ),
        make_test(
            "Total Cholesterol",
            "232",
            "mg/dL",
            "Desirable: <200; Borderline: 200-239; High: >=240",
            section="Lipid Profile",
            ref_high=200,
            lab_flag="H",
        ),
        make_test("Urine Sugar", "Positive (+)", None, "Negative", section="Urine Routine"),
    ]
    data = dict(
        is_lab_report=True,
        lab_name="City Diagnostics",
        patient_name="A. Sharma",
        patient_age="52 Y",
        patient_sex="Male",
        report_date="2026-09-12",
        tests=tests,
    )
    data.update(overrides)
    return ExtractedReport(**data)


class FakeExtractor:
    """Returns the given results in turn, one per uploaded file."""

    def __init__(self, *results: ExtractedReport | Exception):
        self.results = list(results)
        self.calls: list[str] = []

    def extract(self, data: bytes, content_type: str) -> ExtractedReport:
        self.calls.append(content_type)
        result = self.results[min(len(self.calls), len(self.results)) - 1]
        if isinstance(result, Exception):
            raise result
        return result


class FakeWriter:
    def __init__(self, error: Exception | None = None):
        self.error = error
        self.explained: list[tuple[str, str]] = []
        self.briefed: list = []

    def explain(self, report, language):
        if self.error:
            raise self.error
        self.explained.append((report.id, language))
        return ReportExplanation(
            summary=f"Summary in {language}",
            see_doctor_soon=False,
            see_doctor_reason=None,
            flagged=[
                ExplainedTest(
                    test_name="Haemoglobin",
                    what_it_measures="Oxygen-carrying protein",
                    what_your_result_means="A little low",
                    common_reasons=["Low iron"],
                    what_you_can_do="Eat iron-rich food",
                )
            ],
            normal_summary="The rest is fine.",
            questions_for_doctor=["Do I need iron tablets?"],
        )

    def brief(self, trends):
        if self.error:
            raise self.error
        self.briefed.append(trends)
        return DoctorBrief(
            overview="Haemoglobin is falling.",
            key_findings=[BriefFinding(test="Haemoglobin", finding="Fell from 12.1 to 11.2 g/dL.")],
            questions_for_doctor=["Why is it falling?"],
        )


@pytest.fixture
def session_factory(tmp_path):
    engine = make_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(engine)
    yield sessionmaker(bind=engine, expire_on_commit=False)
    engine.dispose()


@pytest.fixture
def storage(tmp_path):
    return EncryptedStorage(LocalStorage(tmp_path / "uploads"), LocalKeyWrapper(os.urandom(32)))


@pytest.fixture
def extractor():
    return FakeExtractor(sample_report())


@pytest.fixture
def writer():
    return FakeWriter()


@pytest.fixture
def client(session_factory, storage, extractor, writer):
    app.dependency_overrides[get_session_factory] = lambda: session_factory
    app.dependency_overrides[get_storage] = lambda: storage
    app.dependency_overrides[get_extractor] = lambda: extractor
    app.dependency_overrides[get_writer] = lambda: writer
    limiters = Limiters(get_settings())  # fresh counts for every test
    app.dependency_overrides[get_limiters] = lambda: limiters
    with TestClient(app) as test_client:
        signup(test_client)
        # Every test starts signed in, with the profile created at sign-up.
        test_client.profile_id = test_client.get("/api/profiles").json()[0]["id"]
        yield test_client
    app.dependency_overrides.clear()


PASSWORD = "correct horse battery"


def signup(client, email="asha@example.com", name="Asha Patel", password=PASSWORD):
    return client.post("/api/auth/signup", json={"name": name, "email": email, "password": password})


def upload(client, data=PDF_BYTES, name="report.pdf", profile_id=None):
    return client.post(
        "/api/reports",
        data={"profile_id": profile_id or client.profile_id},
        files={"file": (name, data, "application/octet-stream")},
    )
