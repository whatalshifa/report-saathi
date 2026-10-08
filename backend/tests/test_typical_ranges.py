"""Typical ranges: used only when a report prints no range of its own, and always labelled."""

import json
import sqlite3
from datetime import date

import pytest

from app.models import Flag, Profile, Relation, Report
from app.services.extraction import ExtractedReport
from app.services.processing import adult_ranges_fit, build_results
from app.services.writing import EXPLAIN_PROMPT, _report_payload
from tests.conftest import FakeExtractor, make_test, sample_report, upload
from tests.test_privacy import _alembic


def reading(*tests) -> ExtractedReport:
    return sample_report(tests=list(tests))


def only(sex, test):
    return build_results(reading(test), sex)[0]


def test_a_value_with_no_printed_range_uses_the_typical_range_for_the_persons_sex():
    hb = only("female", make_test("Haemoglobin", "11.2", "g/dL", None))
    assert (hb.ref_low, hb.ref_high, hb.range_source, hb.flag) == (12, 15, "typical", Flag.low)
    assert (hb.std_low, hb.std_high) == (12, 15)

    # The same value for a man is judged against the men's range.
    assert only("male", make_test("Haemoglobin", "12.5", "g/dL", None)).flag == Flag.low
    assert only("female", make_test("Haemoglobin", "12.5", "g/dL", None)).flag == Flag.normal


def test_the_typical_range_is_kept_in_the_reports_own_unit():
    hb = only("female", make_test("Hb", "110", "g/L", None))
    assert (hb.ref_low, hb.ref_high, hb.flag) == (120, 150, Flag.low)
    assert (hb.std_value, hb.std_low, hb.std_high) == (11, 12, 15)


def test_a_range_the_lab_printed_is_never_replaced():
    hb = only("female", make_test("Haemoglobin", "11.2", "g/dL", "11.0 - 14.0"))
    assert (hb.ref_low, hb.ref_high, hb.range_source, hb.flag) == (11, 14, "lab", Flag.normal)
    # Printed text we can't read as one range is still the lab's: no typical range over it.
    chol = only("female", make_test("Total Cholesterol", "232", "mg/dL", "See interpretation below"))
    assert (chol.ref_low, chol.ref_high, chol.range_source, chol.flag) == (None, None, None, Flag.unknown)


def test_with_the_sex_unknown_only_a_range_for_anyone_is_used():
    hb, wbc = build_results(
        reading(make_test("Haemoglobin", "11.2", "g/dL", None), make_test("TLC", "11500", "/cumm", None)),
        None,
    )
    assert (hb.ref_low, hb.range_source, hb.flag) == (None, None, Flag.unknown)
    assert (wbc.ref_low, wbc.ref_high, wbc.range_source, wbc.flag) == (4000, 10000, "typical", Flag.high)
    assert (
        build_results(reading(make_test("Haemoglobin", "11.2", "g/dL", None)), "other")[0].range_source
        is None
    )


@pytest.mark.parametrize(
    ("test", "why"),
    [
        (make_test("Colour", "7.0", None, None), "not in the catalog"),
        (make_test("Haemoglobin", "11.2", "mmol/L", None), "a unit we can't convert"),
        (make_test("Haemoglobin", "Clotted", "g/dL", None), "not a number"),
        (make_test("MPV", "10.2", "fL", None), "no verified typical range"),
    ],
)
def test_no_typical_range_when_we_cannot_be_sure(test, why):
    result = only("female", test)
    assert (result.ref_low, result.ref_high, result.range_source) == (None, None, None), why


def test_no_typical_range_without_a_unit_unless_the_test_has_none():
    # "2.5" platelets is lakhs and "7.2" WBC thousands: with no unit and no range, the scale is a guess.
    for test in (
        make_test("Platelet Count", "2.5", None, None),
        make_test("Total WBC Count", "7.2", None, None),
        make_test("Haemoglobin", "132", "  ", None),
    ):
        result = only("female", test)
        assert (result.range_source, result.flag) == (None, Flag.unknown), test.name
    # A ratio has no unit to print, so its typical range still applies.
    inr = only("female", make_test("INR", "1.0", None, None))
    assert (inr.ref_low, inr.ref_high, inr.range_source, inr.flag) == (0.8, 1.1, "typical", Flag.normal)


def test_the_labs_own_high_or_low_mark_is_never_contradicted():
    # The lab's range was on another line we didn't read; 38 is inside the typical range, but the lab said H.
    alt = only("male", make_test("ALT (SGPT)", "38", "U/L", None, lab_flag="H"))
    assert (alt.ref_high, alt.range_source, alt.flag) == (None, None, Flag.unknown)


@pytest.mark.parametrize(
    ("test", "key"),
    [
        (make_test("Calcium, Urine", "15", "mg/dL", None), None),
        (make_test("Uric Acid, Urine", "40", "mg/dL", None), None),
        (
            make_test(
                "Glucose", "250", "mg/dL", None, section="Urine Examination", catalog_key="glucose_fasting"
            ),
            None,
        ),
        (make_test("Cholesterol, VLDL", "260", "mg/dL", None), "cholesterol_total"),
    ],
)
def test_a_value_matched_only_by_the_start_of_its_name_gets_no_typical_range(test, key):
    """A urine value is never put on a blood test, and a loose match is never judged."""
    result = only("female", test)
    assert (result.catalog_key, result.range_source, result.flag) == (key, None, Flag.unknown)


def test_a_sample_or_method_after_the_name_still_counts_as_a_match():
    creatinine = only("female", make_test("Creatinine, Serum", "1.3", "mg/dL", None))
    assert (creatinine.catalog_key, creatinine.range_source, creatinine.flag) == (
        "creatinine",
        "typical",
        Flag.high,
    )
    sugar = only(
        "female", make_test("Glucose", "1+", None, None, section="Urine", catalog_key="urine_glucose")
    )
    assert sugar.catalog_key == "urine_glucose"


def test_typical_ranges_are_for_adults_only():
    on = Report(report_date=date(2026, 9, 12))
    assert not adult_ranges_fit(Profile(relation=Relation.child, birth_year=2019), on)
    # Born in 2008, they may still be 17 on that day.
    assert not adult_ranges_fit(Profile(relation=Relation.self, birth_year=2008), on)
    assert adult_ranges_fit(Profile(relation=Relation.self, birth_year=2007), on)
    # No birth year: the age printed on the report, then whether the profile is a child's.
    assert adult_ranges_fit(Profile(relation=Relation.child), Report(patient_age="34 Yrs/M"))
    assert not adult_ranges_fit(Profile(relation=Relation.self), Report(patient_age="9 Y"))
    assert not adult_ranges_fit(Profile(relation=Relation.self), Report(patient_age="8 Months"))
    assert not adult_ranges_fit(Profile(relation=Relation.child), Report(patient_age=None))
    assert adult_ranges_fit(Profile(relation=Relation.parent), Report(patient_age=None))

    # A child's normal ALP of 280 would be "high" against the adult 40-129.
    alp = build_results(reading(make_test("ALP", "280", "U/L", None)), "male", typical=False)[0]
    assert (alp.range_source, alp.flag) == (None, Flag.unknown)


@pytest.fixture
def extractor():
    return FakeExtractor(
        reading(
            make_test("Haemoglobin", "11.2", "g/dL", None, section="Complete Blood Count"),
            make_test("Platelet Count", "2,50,000", "/cumm", "1,50,000 - 4,50,000"),
        )
    )


def set_sex(client, sex):
    body = {"name": "Asha Patel", "relation": "self", "sex": sex}
    assert client.put(f"/api/profiles/{client.profile_id}", json=body).status_code == 200


def test_the_api_says_which_range_is_typical_and_gives_the_loinc_code(client):
    set_sex(client, "female")
    report = client.get(f"/api/reports/{upload(client).json()['id']}").json()
    hb, plt = report["results"]
    assert (hb["range_source"], hb["ref_low"], hb["ref_high"], hb["flag"]) == ("typical", 12, 15, "low")
    assert hb["loinc"] == "718-7"
    assert "Dacie and Lewis" in hb["typical_range_source"]
    assert (plt["range_source"], plt["typical_range_source"], plt["loinc"]) == ("lab", None, "777-3")
    assert report["out_of_range"] == 1

    series = {s["key"]: s for s in client.get(f"/api/profiles/{client.profile_id}/trends").json()["series"]}
    assert (series["hemoglobin"]["range_source"], series["hemoglobin"]["loinc"]) == ("typical", "718-7")
    assert series["platelets"]["range_source"] == "lab"


def test_the_explanation_is_told_which_ranges_are_typical(client, session_factory):
    set_sex(client, "female")
    report_id = upload(client).json()["id"]
    with session_factory() as session:
        hb, plt = json.loads(_report_payload(session.get(Report, report_id)))["results"]
    assert (hb["range_source"], hb["range"], hb["normal_range"], hb["flag"]) == (
        "typical",
        [12, 15],
        None,
        "low",
    )
    assert (plt["range_source"], plt["range"]) == ("lab", [150000, 450000])
    assert 'Where range_source is "typical", the lab printed no range' in EXPLAIN_PROMPT


def test_setting_the_persons_sex_later_picks_the_typical_range_then(client):
    report_id = upload(client).json()["id"]
    hb = client.get(f"/api/reports/{report_id}").json()["results"][0]
    assert (hb["range_source"], hb["flag"]) == (None, "unknown")

    set_sex(client, "male")
    hb = client.get(f"/api/reports/{report_id}").json()["results"][0]
    assert (hb["ref_low"], hb["ref_high"], hb["flag"]) == (13, 17, "low")
    set_sex(client, None)
    assert client.get(f"/api/reports/{report_id}").json()["results"][0]["range_source"] is None


def test_a_fixed_unit_converts_the_typical_range_too(client):
    set_sex(client, "female")
    report = client.get(f"/api/reports/{upload(client).json()['id']}").json()
    hb = report["results"][0]
    fixed = client.patch(
        f"/api/reports/{report['id']}/results/{hb['id']}", json={"value_text": "125", "unit": "g/L"}
    ).json()
    assert (fixed["ref_low"], fixed["ref_high"], fixed["range_source"], fixed["flag"]) == (
        120,
        150,
        "typical",
        "normal",
    )


def test_migration_marks_every_range_read_so_far_as_the_labs(tmp_path):
    db = tmp_path / "migrate.db"
    _alembic(db, "upgrade", "0009")
    with sqlite3.connect(db) as conn:
        conn.execute(
            "INSERT INTO users (id, email, name, password_hash, failed_logins, is_guest, created_at) "
            "VALUES ('u1', 'old@example.com', 'Old', 'x', 0, 0, '2026-01-01 00:00:00')"
        )
        conn.execute(
            "INSERT INTO profiles (id, user_id, name, relation, is_sample, created_at) "
            "VALUES ('p1', 'u1', 'Old', 'self', 0, '2026-01-01 00:00:00')"
        )
        conn.execute(
            "INSERT INTO reports (id, profile_id, filename, content_type, storage_key, is_sample, status, "
            "created_at, updated_at) VALUES ('r1', 'p1', 'a.pdf', 'application/pdf', 'r1.pdf', 0, 'done', "
            "'2026-01-01 00:00:00', '2026-01-01 00:00:00')"
        )
        conn.executemany(
            "INSERT INTO test_results (report_id, position, name, value_text, flag, ref_low, ref_high) "
            "VALUES ('r1', ?, ?, '1', 'normal', ?, ?)",
            [(0, "Hb", 12, 15), (1, "LDL", None, 100), (2, "Colour", None, None)],
        )
    _alembic(db, "upgrade", "head")
    with sqlite3.connect(db) as conn:
        assert conn.execute("SELECT name, range_source FROM test_results ORDER BY position").fetchall() == [
            ("Hb", "lab"),
            ("LDL", "lab"),
            ("Colour", None),
        ]
    _alembic(db, "downgrade", "0009")
    with sqlite3.connect(db) as conn:
        assert conn.execute("SELECT count(*) FROM test_results").fetchone() == (3,)
        assert "range_source" not in {row[1] for row in conn.execute("PRAGMA table_info(test_results)")}


def test_meeras_april_report_shows_a_typical_range_where_her_lab_printed_none(client):
    meera = client.post("/api/samples").json()
    reports = client.get("/api/reports", params={"profile_id": meera["id"]}).json()
    april = next(r for r in reports if r["report_date"] == "2026-04-20")
    results = client.get(f"/api/reports/{april['id']}").json()["results"]
    creatinine = next(r for r in results if r["catalog_key"] == "creatinine")
    # She is a woman, so the women's range is used, and labelled as typical.
    assert (creatinine["ref_low"], creatinine["ref_high"], creatinine["flag"]) == (0.59, 1.04, "normal")
    assert creatinine["range_source"] == "typical"
    assert {r["range_source"] for r in results if r is not creatinine} == {"lab"}


def add_profile(client, name, relation="spouse", sex=None, birth_year=None):
    body = {"name": name, "relation": relation, "sex": sex, "birth_year": birth_year}
    response = client.post("/api/profiles", json=body)
    assert response.status_code == 201
    return response.json()["id"]


def hb_of(client, report_id):
    return client.get(f"/api/reports/{report_id}").json()["results"][0]


@pytest.mark.parametrize(
    "extractor", [FakeExtractor(reading(make_test("Haemoglobin", "12.5", "g/dL", None)))]
)
def test_moving_a_report_picks_the_typical_range_for_the_new_person(client):
    set_sex(client, "male")
    report_id = upload(client).json()["id"]
    hb = hb_of(client, report_id)
    assert (hb["ref_low"], hb["ref_high"], hb["range_source"], hb["flag"]) == (13, 17, "typical", "low")

    wife = add_profile(client, "Sunita Patel", sex="female")
    assert client.patch(f"/api/reports/{report_id}", json={"profile_id": wife}).status_code == 200
    hb = hb_of(client, report_id)
    assert (hb["ref_low"], hb["ref_high"], hb["range_source"], hb["flag"]) == (12, 15, "typical", "normal")

    unknown = add_profile(client, "Someone")
    assert client.patch(f"/api/reports/{report_id}", json={"profile_id": unknown}).status_code == 200
    hb = hb_of(client, report_id)
    assert (hb["ref_low"], hb["range_source"], hb["flag"]) == (None, None, "unknown")


def test_a_childs_report_gets_no_adult_range_until_their_birth_year_says_adult(client):
    child = add_profile(client, "Aarav Patel", relation="child", sex="male", birth_year=2019)
    report_id = upload(client, profile_id=child).json()["id"]
    assert hb_of(client, report_id)["range_source"] is None

    # The birth year was mistyped: they are a grown-up son.
    body = {"name": "Aarav Patel", "relation": "child", "sex": "male", "birth_year": 1995}
    assert client.put(f"/api/profiles/{child}", json=body).status_code == 200
    hb = hb_of(client, report_id)
    assert (hb["ref_low"], hb["ref_high"], hb["flag"]) == (13, 17, "low")
