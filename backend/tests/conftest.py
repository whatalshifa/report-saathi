import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_session_factory, make_engine
from app.main import app
from app.services.extraction import ExtractedReport, ExtractedTest, get_extractor
from app.services.storage import LocalStorage, get_storage

PDF_BYTES = b"%PDF-1.4\n% fake test pdf\n"


def sample_report(**overrides) -> ExtractedReport:
    tests = [
        ExtractedTest(
            section="Complete Blood Count",
            name="Haemoglobin",
            value_text="11.2",
            numeric_value=11.2,
            unit="g/dL",
            reference_text="13.0 - 17.0",
            ref_low=13.0,
            ref_high=17.0,
            lab_flag="L",
        ),
        ExtractedTest(
            section="Complete Blood Count",
            name="Platelet Count",
            value_text="2,50,000",
            numeric_value=250000,
            unit="/cumm",
            reference_text="1,50,000 - 4,50,000",
            ref_low=150000,
            ref_high=450000,
            lab_flag=None,
        ),
        ExtractedTest(
            section="Lipid Profile",
            name="Total Cholesterol",
            value_text="232",
            numeric_value=232,
            unit="mg/dL",
            reference_text="Desirable: <200; Borderline: 200-239; High: >=240",
            ref_low=None,
            ref_high=200,
            lab_flag="H",
        ),
        ExtractedTest(
            section="Urine Routine",
            name="Urine Sugar",
            value_text="Positive (+)",
            numeric_value=None,
            unit=None,
            reference_text="Negative",
            ref_low=None,
            ref_high=None,
            lab_flag=None,
        ),
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
    def __init__(self, result: ExtractedReport | Exception):
        self.result = result
        self.calls: list[str] = []

    def extract(self, data: bytes, content_type: str) -> ExtractedReport:
        self.calls.append(content_type)
        if isinstance(self.result, Exception):
            raise self.result
        return self.result


@pytest.fixture
def session_factory(tmp_path):
    engine = make_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(engine)
    yield sessionmaker(bind=engine, expire_on_commit=False)
    engine.dispose()


@pytest.fixture
def storage(tmp_path):
    return LocalStorage(tmp_path / "uploads")


@pytest.fixture
def extractor():
    return FakeExtractor(sample_report())


@pytest.fixture
def client(session_factory, storage, extractor):
    app.dependency_overrides[get_session_factory] = lambda: session_factory
    app.dependency_overrides[get_storage] = lambda: storage
    app.dependency_overrides[get_extractor] = lambda: extractor
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
