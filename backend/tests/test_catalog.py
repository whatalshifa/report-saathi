import re
from typing import get_args

import pytest

from app.services.catalog import (
    CATALOG,
    CATALOG_KEYS,
    _normalize_name,
    conversion_factor,
    get_test,
    match_test,
    normalize_unit,
    typical_range,
)
from app.services.extraction import CatalogKey
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


# ---------- The catalog's data: aliases, units, LOINC codes, typical ranges, recheck intervals ----------


def loinc_check_digit(body: str) -> int:
    """LOINC's mod-10 check digit: from the right, double every other digit starting with the last."""
    total = 0
    for i, ch in enumerate(reversed(body)):
        digit = int(ch) * (2 if i % 2 == 0 else 1)
        total += digit - 9 if digit > 9 else digit
    return (10 - total % 10) % 10


@pytest.mark.parametrize(
    ("code", "valid"), [("4548-4", True), ("718-7", True), ("2093-3", True), ("4548-5", False)]
)
def test_loinc_check_digit(code, valid):
    body, check = code.split("-")
    assert (loinc_check_digit(body) == int(check)) is valid


def test_every_alias_means_exactly_one_test():
    owners: dict[str, set[str]] = {}
    for test in CATALOG:
        for alias in (*test.aliases, test.name):
            owners.setdefault(_normalize_name(alias), set()).add(test.key)
    shared = {alias: keys for alias, keys in owners.items() if len(keys) > 1}
    assert shared == {}
    assert all(alias for alias in owners)  # nothing normalises to an empty name


def test_keys_are_unique_and_offered_to_the_reader():
    keys = [t.key for t in CATALOG]
    assert len(keys) == len(set(keys)) == len(CATALOG_KEYS)
    assert len(keys) >= 225
    assert set(get_args(CatalogKey)) == {*keys, "other"}


def test_units_convert_with_positive_factors_and_never_disagree():
    for test in CATALOG:
        seen: dict[str, float] = {normalize_unit(test.unit): 1.0}
        for unit, factor in test.units.items():
            assert factor > 0, (test.key, unit)
            normalized = normalize_unit(unit)
            # Two spellings of one unit (or the standard unit itself) must convert the same way.
            assert seen.setdefault(normalized, factor) == pytest.approx(factor), (test.key, unit)


def test_loinc_codes_look_like_loinc_and_are_not_shared():
    codes = [t.loinc for t in CATALOG if t.loinc]
    assert len(codes) == len(set(codes))
    for code in codes:
        assert re.fullmatch(r"\d{1,7}-\d", code), code
        body, check = code.split("-")
        assert loinc_check_digit(body) == int(check), code


def test_typical_ranges_and_recheck_intervals_name_their_source():
    for test in CATALOG:
        sexes = [r.sex for r in test.typical]
        assert len(sexes) == len(set(sexes)) and set(sexes) <= {"any", "male", "female"}, test.key
        for r in test.typical:
            assert r.low is not None or r.high is not None, test.key
            assert r.low is None or r.high is None or r.low < r.high, test.key
        assert bool(test.typical) == bool(test.typical_source), test.key
        if test.recheck_months is not None:
            assert test.recheck_months > 0 and test.recheck_source, test.key


@pytest.mark.parametrize(
    ("printed", "key"),
    [
        ("Absolute Neutrophil Count", "neutrophils_abs"),
        ("SGOT/SGPT Ratio", "ast_alt_ratio"),
        ("A/G Ratio", "ag_ratio"),
        ("Urine Microalbumin/Creatinine Ratio", "urine_acr"),
        ("UACR", "urine_acr"),
        ("Non-HDL Cholesterol", "non_hdl"),
        ("Prothrombin Time (PT)", "prothrombin_time"),
        ("INR", "inr"),
        ("Pus Cells (Urine)", "urine_pus_cells"),
        ("Anti Müllerian Hormone", "amh"),
        ("Transferrin Saturation", "transferrin_saturation"),
        ("Bile Pigments", "urine_bilirubin"),
        ("Urobilinogen", "urine_urobilinogen"),
        ("Haemoglobin (Urine)", "urine_blood"),
        ("PT Control", "pt_control"),
        ("APTT Control", "aptt_control"),
        ("Total Protein (24 Hour Urine)", "urine_protein_24h"),
        ("Urine Protein/Creatinine Ratio", "urine_pcr"),
        ("Corrected Calcium", "calcium_corrected"),
        ("Band Forms", "band_forms"),
        ("Total CO2", "total_co2"),
        ("Urine Colour", "urine_colour"),
    ],
)
def test_new_tests_match_by_alias(printed, key):
    assert match_test(printed).key == key


def test_typical_range_picks_by_sex_and_never_guesses_one():
    hb, wbc, psa = get_test("hemoglobin"), get_test("wbc"), get_test("psa_total")
    assert (typical_range(hb, "female").low, typical_range(hb, "female").high) == (12, 15)
    assert typical_range(hb, "Male").low == 13
    # Unknown sex, or "other": a male or female range is never used.
    assert typical_range(hb, None) is None
    assert typical_range(hb, "other") is None
    # A range for anyone is used whatever the sex.
    assert typical_range(wbc, None).high == 10000
    assert typical_range(wbc, "female").high == 10000
    assert typical_range(psa, "female") is None
    assert get_test("hba1c").loinc == "4548-4"


@pytest.mark.parametrize(
    ("key", "unit", "factor"),
    [
        ("urine_protein_24h", "g/24 hrs", 1000),
        ("urine_protein_24h", "mg/24 hr", 1),
        ("urine_creatinine_24h", "mmol/24 hr", 1000 / 8.842),
        ("urine_pcr", "mg/g", 0.001),
        ("urine_bilirubin", "µmol/L", 1 / 17.1),
        ("beta_hydroxybutyrate", "µmol/L", 0.001),
        ("urine_microalbumin_24h", "µg/min", 1.44),
    ],
)
def test_new_tests_convert_their_units(key, unit, factor):
    assert conversion_factor(get_test(key), unit) == pytest.approx(factor)


def test_new_tests_carry_only_their_verified_data():
    clearance = get_test("creatinine_clearance")
    assert (typical_range(clearance, "male").low, typical_range(clearance, "female").low) == (97, 88)
    assert typical_range(clearance, None) is None
    assert get_test("hba1c_ifcc").recheck_months == 3
    # No verified code or range: left empty rather than guessed.
    assert get_test("mid_cells").loinc is None and get_test("urine_crystals").loinc is None
    assert get_test("ldh").loinc is None
    assert get_test("egfr").typical == ()
