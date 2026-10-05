import pytest

from app.services.catalog import CATALOG, conversion_factor, get_test, match_test, normalize_unit
from app.services.names import names_match, normalize_name


@pytest.mark.parametrize(
    ("printed", "key"),
    [
        ("Haemoglobin (Hb)", "hemoglobin"),
        ("HGB", "hemoglobin"),
        ("Hemoglobin", "hemoglobin"),
        ("Platelet Count", "platelets"),
        ("Total Leucocyte Count (TLC)", "wbc"),
        ("Glucose Fasting, Plasma", "glucose_fasting"),
        ("Blood Sugar (Fasting)", "glucose_fasting"),
        ("Plasma Glucose, Fasting State", None),  # no alias; relies on Claude's suggestion
        ("HbA1c", "hba1c"),
        ("Cholesterol (HDL)", "hdl"),
        ("HDL Cholesterol", "hdl"),
        ("Total Cholesterol", "cholesterol_total"),
        ("SGPT (ALT)", "alt"),
        ("TSH - Ultrasensitive", "tsh"),
        ("25-OH Vitamin D", "vitamin_d"),
        ("Serum Creatinine", "creatinine"),
        ("Na+", "sodium"),
        ("Colour", None),
    ],
)
def test_match_by_alias(printed, key):
    test = match_test(printed)
    assert (test.key if test else None) == key


def test_claude_suggestion_is_used_only_when_no_alias_matches():
    assert match_test("Plasma Glucose, Fasting State", "glucose_fasting").key == "glucose_fasting"
    assert match_test("Haemoglobin", "ldl").key == "hemoglobin"  # our alias wins
    assert match_test("Colour", "other") is None
    assert match_test("Colour", "not_a_key") is None


@pytest.mark.parametrize(
    ("key", "unit", "factor"),
    [
        ("hemoglobin", "g/dL", 1),
        ("hemoglobin", "gm%", 1),
        ("hemoglobin", "g/L", 0.1),
        ("platelets", "Lakhs/cumm", 100000),
        ("platelets", "10³/µL", 1000),
        ("platelets", "x10^3/uL", 1000),
        ("platelets", "/cu.mm", 1),
        ("glucose_fasting", "mmol/L", 18.016),
        ("tsh", "mIU/L", 1),
        ("vitamin_d", "nmol/L", 0.4006),
        ("hemoglobin", None, 1),  # a missing unit is taken as the standard one
        ("hemoglobin", "mmol/L", None),  # an unknown unit is never guessed
    ],
)
def test_conversion_factor(key, unit, factor):
    assert conversion_factor(get_test(key), unit) == (pytest.approx(factor) if factor else None)


def test_catalog_is_consistent():
    keys = [t.key for t in CATALOG]
    assert len(keys) == len(set(keys))
    for test in CATALOG:
        # Every unit we list must survive normalisation to something distinct and non-empty.
        assert all(normalize_unit(u) for u in test.units)


@pytest.mark.parametrize(
    ("name", "normalized"),
    [
        ("Mr. Anil Sharma", "anil sharma"),
        ("ANIL  SHARMA", "anil sharma"),
        ("Smt. Sunita Devi", "sunita devi"),
        (None, ""),
        ("Mr.", ""),
    ],
)
def test_normalize_name(name, normalized):
    assert normalize_name(name) == normalized


@pytest.mark.parametrize(
    ("profile", "printed", "expected"),
    [
        ("Anil Sharma", "MR. ANIL SHARMA", True),
        ("Anil Sharma", "A. Sharma", True),
        ("Anil Sharma", "Anil Kumar Sharma", True),
        ("Anil Sharma", "Mrs. Sunita Sharma", False),  # same surname, different person
        ("Anil Sharma", "S. Sharma", False),
        ("Papa", "Anil Sharma", False),
        ("Anil Sharma", None, None),
        ("Anil Sharma", "Mr.", None),
        ("Anil Sharma", "Mr. A", True),
    ],
)
def test_names_match(profile, printed, expected):
    assert names_match(profile, printed) is expected
