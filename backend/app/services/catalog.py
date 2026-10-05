"""One shared name and unit for each common lab test, so reports from different labs line up.

Lab A prints "Hb 13.2 g/dL", lab B prints "Haemoglobin 132 g/L", lab C prints
"HGB 13.4 gm%". They are the same test. This catalog maps every spelling to one
key ("hemoglobin") and converts every unit to one standard unit, so a timeline
can put all three values on one chart.

Matching is plain code first (the alias lists below). Only when no alias matches
do we use the key Claude suggested while reading the report, and only if that key
is in this catalog.
"""

import re
from dataclasses import dataclass, field


@dataclass(frozen=True)
class TestDef:
    key: str
    name: str  # what we show to people
    unit: str  # the standard unit every value is converted to
    aliases: tuple[str, ...]
    # Multiply a value in this unit by the factor to get the standard unit.
    units: dict[str, float] = field(default_factory=dict)

    __test__ = False


# Units that are written many ways but mean the same thing.
_PER_UL = {"/ul": 1, "/cumm": 1, "/mm3": 1, "cells/ul": 1, "cells/cumm": 1, "/cmm": 1}
_THOUSAND_PER_UL = {"10^3/ul": 1e3, "x10^3/ul": 1e3, "thou/ul": 1e3, "10^9/l": 1e3, "k/ul": 1e3, "/nl": 1e3}
_PERCENT = {"%": 1}

CATALOG: tuple[TestDef, ...] = (
    # Complete blood count
    TestDef(
        "hemoglobin",
        "Haemoglobin",
        "g/dL",
        ("hemoglobin", "haemoglobin", "hb", "hgb"),
        {"g/dl": 1, "gm/dl": 1, "gm%": 1, "g%": 1, "g/l": 0.1},
    ),
    TestDef(
        "rbc",
        "Red blood cell count",
        "million/µL",
        (
            "rbc",
            "rbc count",
            "red blood cell count",
            "total rbc count",
            "erythrocyte count",
            "red cell count",
        ),
        {
            "million/ul": 1,
            "mill/cumm": 1,
            "million/cumm": 1,
            "10^6/ul": 1,
            "x10^6/ul": 1,
            "10^12/l": 1,
            "mil/ul": 1,
            "m/ul": 1,
        },
    ),
    TestDef(
        "wbc",
        "White blood cell count",
        "/µL",
        (
            "wbc",
            "wbc count",
            "tlc",
            "total leucocyte count",
            "total leukocyte count",
            "total wbc count",
            "white blood cell count",
            "total count",
        ),
        {**_PER_UL, **_THOUSAND_PER_UL},
    ),
    TestDef(
        "platelets",
        "Platelet count",
        "/µL",
        ("platelet count", "platelets", "plt", "platelet"),
        {**_PER_UL, **_THOUSAND_PER_UL, "lakhs/cumm": 1e5, "lakh/cumm": 1e5, "lakhs/ul": 1e5},
    ),
    TestDef(
        "hematocrit",
        "Haematocrit (PCV)",
        "%",
        ("hematocrit", "haematocrit", "pcv", "packed cell volume", "hct"),
        _PERCENT,
    ),
    TestDef("mcv", "MCV", "fL", ("mcv", "mean corpuscular volume"), {"fl": 1, "cu micron": 1, "µm3": 1}),
    TestDef(
        "mch",
        "MCH",
        "pg",
        ("mch", "mean corpuscular hemoglobin", "mean corpuscular haemoglobin"),
        {"pg": 1, "picogram": 1},
    ),
    TestDef(
        "mchc",
        "MCHC",
        "g/dL",
        ("mchc", "mean corpuscular hemoglobin concentration", "mean corpuscular haemoglobin concentration"),
        {"g/dl": 1, "gm/dl": 1, "%": 1, "g/l": 0.1},
    ),
    TestDef("rdw", "RDW", "%", ("rdw", "rdw cv", "red cell distribution width"), _PERCENT),
    TestDef("neutrophils", "Neutrophils", "%", ("neutrophils", "neutrophil", "polymorphs"), _PERCENT),
    TestDef("lymphocytes", "Lymphocytes", "%", ("lymphocytes", "lymphocyte"), _PERCENT),
    TestDef("monocytes", "Monocytes", "%", ("monocytes", "monocyte"), _PERCENT),
    TestDef("eosinophils", "Eosinophils", "%", ("eosinophils", "eosinophil"), _PERCENT),
    TestDef("basophils", "Basophils", "%", ("basophils", "basophil"), _PERCENT),
    TestDef(
        "esr",
        "ESR",
        "mm/hr",
        ("esr", "erythrocyte sedimentation rate"),
        {"mm/hr": 1, "mm/1st hr": 1, "mm/h": 1, "mm at 1 hr": 1},
    ),
    # Diabetes
    TestDef(
        "glucose_fasting",
        "Fasting blood sugar",
        "mg/dL",
        (
            "fasting blood sugar",
            "fbs",
            "glucose fasting",
            "fasting glucose",
            "blood sugar fasting",
            "fasting plasma glucose",
            "fpg",
            "plasma glucose fasting",
            "glucose f",
        ),
        {"mg/dl": 1, "mmol/l": 18.016},
    ),
    TestDef(
        "glucose_pp",
        "Post-meal blood sugar",
        "mg/dL",
        (
            "post prandial blood sugar",
            "ppbs",
            "glucose pp",
            "blood sugar pp",
            "post prandial glucose",
            "plasma glucose pp",
            "glucose post prandial",
        ),
        {"mg/dl": 1, "mmol/l": 18.016},
    ),
    TestDef(
        "glucose_random",
        "Random blood sugar",
        "mg/dL",
        ("random blood sugar", "rbs", "glucose random", "random glucose", "plasma glucose random"),
        {"mg/dl": 1, "mmol/l": 18.016},
    ),
    TestDef(
        "hba1c",
        "HbA1c",
        "%",
        (
            "hba1c",
            "glycated hemoglobin",
            "glycosylated hemoglobin",
            "glycated haemoglobin",
            "glycosylated haemoglobin",
            "a1c",
        ),
        _PERCENT,
    ),
    # Lipid profile
    TestDef(
        "cholesterol_total",
        "Total cholesterol",
        "mg/dL",
        ("total cholesterol", "cholesterol total", "cholesterol", "serum cholesterol", "s cholesterol"),
        {"mg/dl": 1, "mmol/l": 38.67},
    ),
    TestDef(
        "hdl",
        "HDL cholesterol",
        "mg/dL",
        ("hdl", "hdl cholesterol", "cholesterol hdl", "hdl c", "high density lipoprotein"),
        {"mg/dl": 1, "mmol/l": 38.67},
    ),
    TestDef(
        "ldl",
        "LDL cholesterol",
        "mg/dL",
        (
            "ldl",
            "ldl cholesterol",
            "cholesterol ldl",
            "ldl c",
            "low density lipoprotein",
            "ldl cholesterol direct",
            "ldl cholesterol calculated",
        ),
        {"mg/dl": 1, "mmol/l": 38.67},
    ),
    TestDef(
        "vldl",
        "VLDL cholesterol",
        "mg/dL",
        ("vldl", "vldl cholesterol", "very low density lipoprotein"),
        {"mg/dl": 1, "mmol/l": 38.67},
    ),
    TestDef(
        "triglycerides",
        "Triglycerides",
        "mg/dL",
        ("triglycerides", "triglyceride", "tg", "serum triglycerides"),
        {"mg/dl": 1, "mmol/l": 88.57},
    ),
    # Kidney
    TestDef(
        "creatinine",
        "Creatinine",
        "mg/dL",
        ("creatinine", "serum creatinine", "s creatinine"),
        {"mg/dl": 1, "umol/l": 1 / 88.42},
    ),
    TestDef("urea", "Urea", "mg/dL", ("urea", "blood urea", "serum urea"), {"mg/dl": 1, "mmol/l": 6.006}),
    TestDef(
        "bun",
        "Blood urea nitrogen",
        "mg/dL",
        ("bun", "blood urea nitrogen", "urea nitrogen"),
        {"mg/dl": 1, "mmol/l": 2.801},
    ),
    TestDef(
        "uric_acid",
        "Uric acid",
        "mg/dL",
        ("uric acid", "serum uric acid", "s uric acid"),
        {"mg/dl": 1, "umol/l": 1 / 59.48},
    ),
    TestDef(
        "egfr",
        "eGFR",
        "mL/min/1.73m²",
        ("egfr", "estimated gfr", "estimated glomerular filtration rate"),
        {"ml/min/1.73m2": 1, "ml/min/1.73 m2": 1, "ml/min/1.73m²": 1, "ml/min": 1},
    ),
    TestDef("sodium", "Sodium", "mmol/L", ("sodium", "serum sodium", "na", "na+"), {"mmol/l": 1, "meq/l": 1}),
    TestDef(
        "potassium",
        "Potassium",
        "mmol/L",
        ("potassium", "serum potassium", "k", "k+"),
        {"mmol/l": 1, "meq/l": 1},
    ),
    TestDef(
        "chloride",
        "Chloride",
        "mmol/L",
        ("chloride", "serum chloride", "cl", "cl-"),
        {"mmol/l": 1, "meq/l": 1},
    ),
    TestDef(
        "calcium",
        "Calcium",
        "mg/dL",
        ("calcium", "serum calcium", "total calcium", "ca"),
        {"mg/dl": 1, "mmol/l": 4.008},
    ),
    # Liver
    TestDef(
        "bilirubin_total",
        "Total bilirubin",
        "mg/dL",
        ("total bilirubin", "bilirubin total", "bilirubin", "serum bilirubin total"),
        {"mg/dl": 1, "umol/l": 1 / 17.1},
    ),
    TestDef(
        "bilirubin_direct",
        "Direct bilirubin",
        "mg/dL",
        ("direct bilirubin", "bilirubin direct", "conjugated bilirubin", "bilirubin conjugated"),
        {"mg/dl": 1, "umol/l": 1 / 17.1},
    ),
    TestDef(
        "ast",
        "AST (SGOT)",
        "U/L",
        ("ast", "sgot", "aspartate aminotransferase", "ast sgot", "sgot ast"),
        {"u/l": 1, "iu/l": 1},
    ),
    TestDef(
        "alt",
        "ALT (SGPT)",
        "U/L",
        ("alt", "sgpt", "alanine aminotransferase", "alt sgpt", "sgpt alt"),
        {"u/l": 1, "iu/l": 1},
    ),
    TestDef(
        "alp",
        "Alkaline phosphatase",
        "U/L",
        ("alkaline phosphatase", "alp", "serum alkaline phosphatase"),
        {"u/l": 1, "iu/l": 1},
    ),
    TestDef(
        "ggt", "GGT", "U/L", ("ggt", "gamma gt", "gamma glutamyl transferase", "ggtp"), {"u/l": 1, "iu/l": 1}
    ),
    TestDef(
        "total_protein",
        "Total protein",
        "g/dL",
        ("total protein", "serum total protein", "protein total"),
        {"g/dl": 1, "gm/dl": 1, "g/l": 0.1},
    ),
    TestDef("albumin", "Albumin", "g/dL", ("albumin", "serum albumin"), {"g/dl": 1, "gm/dl": 1, "g/l": 0.1}),
    # Thyroid
    TestDef(
        "tsh",
        "TSH",
        "µIU/mL",
        ("tsh", "thyroid stimulating hormone", "tsh ultrasensitive", "ultrasensitive tsh"),
        {"uiu/ml": 1, "miu/l": 1, "mu/l": 1, "uu/ml": 1},
    ),
    TestDef(
        "t3_total",
        "T3 (total)",
        "ng/dL",
        ("t3", "total t3", "t3 total", "triiodothyronine", "total triiodothyronine"),
        {"ng/dl": 1, "nmol/l": 65.1, "ng/ml": 100},
    ),
    TestDef(
        "t4_total",
        "T4 (total)",
        "µg/dL",
        ("t4", "total t4", "t4 total", "thyroxine", "total thyroxine"),
        {"ug/dl": 1, "nmol/l": 1 / 12.87},
    ),
    TestDef(
        "ft3", "Free T3", "pg/mL", ("ft3", "free t3", "free triiodothyronine"), {"pg/ml": 1, "pmol/l": 0.651}
    ),
    TestDef(
        "ft4", "Free T4", "ng/dL", ("ft4", "free t4", "free thyroxine"), {"ng/dl": 1, "pmol/l": 1 / 12.87}
    ),
    # Vitamins and iron
    TestDef(
        "vitamin_d",
        "Vitamin D",
        "ng/mL",
        (
            "vitamin d",
            "25 oh vitamin d",
            "25 hydroxy vitamin d",
            "vitamin d total",
            "25 oh vit d",
            "vitamin d3",
            "vit d",
        ),
        {"ng/ml": 1, "nmol/l": 0.4006},
    ),
    TestDef(
        "vitamin_b12",
        "Vitamin B12",
        "pg/mL",
        ("vitamin b12", "vit b12", "cyanocobalamin", "b12"),
        {"pg/ml": 1, "pmol/l": 1.355},
    ),
    TestDef("ferritin", "Ferritin", "ng/mL", ("ferritin", "serum ferritin"), {"ng/ml": 1, "ug/l": 1}),
    TestDef("iron", "Iron", "µg/dL", ("iron", "serum iron"), {"ug/dl": 1, "umol/l": 5.585}),
    # Inflammation
    TestDef("crp", "CRP", "mg/L", ("crp", "c reactive protein", "hs crp", "hscrp"), {"mg/l": 1, "mg/dl": 10}),
)

_BY_KEY = {test.key: test for test in CATALOG}
CATALOG_KEYS: tuple[str, ...] = tuple(_BY_KEY)


def _normalize_name(text: str) -> str:
    text = text.lower().replace("haemo", "hemo")
    text = re.sub(r"[^a-z0-9+]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


_ALIASES: dict[str, str] = {}
for _test in CATALOG:
    for _alias in (*_test.aliases, _test.name):
        _ALIASES.setdefault(_normalize_name(_alias), _test.key)


def get_test(key: str | None) -> TestDef | None:
    return _BY_KEY.get(key) if key else None


def match_test(printed_name: str, suggested_key: str | None = None) -> TestDef | None:
    """Find the catalog test for a printed name, e.g. 'Haemoglobin (Hb)' -> hemoglobin."""
    inside = re.findall(r"\(([^)]*)\)", printed_name)
    outside = re.sub(r"\([^)]*\)", " ", printed_name)
    candidates = [printed_name, outside, *inside]
    # Labs often add a method or sample: "Glucose Fasting, Plasma" or "TSH - CLIA".
    candidates += [re.split(r"[,\-:]", outside)[0]]
    for candidate in candidates:
        key = _ALIASES.get(_normalize_name(candidate))
        if key:
            return _BY_KEY[key]
    return get_test(suggested_key)


def normalize_unit(unit: str) -> str:
    text = unit.strip().lower().replace("µ", "u").replace("μ", "u").replace(" ", "")
    text = text.replace("cu.mm", "cumm").replace("cmm", "cumm").replace("mm³", "mm3").replace("×", "x")
    text = text.replace("³", "^3").replace("⁶", "^6").replace("⁹", "^9").replace("¹²", "^12")
    text = text.replace("micromol", "umol").replace("micro", "u").replace("mcg", "ug")
    return text.replace("x10", "10").replace("10e", "10^")


def conversion_factor(test: TestDef, unit: str | None) -> float | None:
    """Factor that turns a value in `unit` into the test's standard unit, or None if unknown.

    A missing unit is taken to be the standard one: labs often leave it out for
    common tests, and the reference range on the same line keeps it honest.
    """
    if not unit:
        return 1.0
    normalized = normalize_unit(unit)
    if normalized == normalize_unit(test.unit):
        return 1.0
    for known, factor in test.units.items():
        if normalize_unit(known) == normalized:
            return factor
    return None
