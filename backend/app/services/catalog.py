"""One shared name and unit for each common lab test, so reports from different labs line up.

Lab A prints "Hb 13.2 g/dL", lab B prints "Haemoglobin 132 g/L", lab C prints
"HGB 13.4 gm%". They are the same test. This catalog maps every spelling to one
key ("hemoglobin") and converts every unit to one standard unit, so a timeline
can put all three values on one chart.

Matching is plain code first (the alias lists below). Only when no alias matches
do we use the key Claude suggested while reading the report, and only if that key
is in this catalog.

Each test can also carry its LOINC code (the international ID for a lab test, so
a doctor's system can recognise it), a typical adult range for when a report
prints none, and how soon doctors often recheck an out-of-range result. Every
code, range and interval here was checked against the named source by two
reviewers; where they couldn't confirm one, it is left out rather than guessed.
"""

import re
from dataclasses import dataclass, field
from typing import Literal

Sex = Literal["any", "male", "female"]


@dataclass(frozen=True)
class TypicalRange:
    """A typical adult range in the test's standard unit. Either end may be open (None)."""

    sex: Sex
    low: float | None
    high: float | None


@dataclass(frozen=True)
class TestDef:
    key: str
    name: str  # what we show to people
    unit: str  # the standard unit every value is converted to
    aliases: tuple[str, ...]
    # Multiply a value in this unit by the factor to get the standard unit.
    units: dict[str, float] = field(default_factory=dict)
    loinc: str | None = None
    # Used only when a report prints no range of its own, and always labelled as such.
    typical: tuple[TypicalRange, ...] = ()
    typical_source: str | None = None
    # How soon doctors often recheck an out-of-range result, for the "due for a recheck" reminder.
    recheck_months: float | None = None
    recheck_source: str | None = None

    __test__ = False


# Units that are written many ways but mean the same thing.
_PER_UL = {"/ul": 1, "/cumm": 1, "/mm3": 1, "cells/ul": 1, "cells/cumm": 1, "/cmm": 1}
_THOUSAND_PER_UL = {"10^3/ul": 1e3, "x10^3/ul": 1e3, "thou/ul": 1e3, "10^9/l": 1e3, "k/ul": 1e3, "/nl": 1e3}
_ABSOLUTE_COUNT = {**_PER_UL, "cells/mm3": 1, **_THOUSAND_PER_UL, "k/cumm": 1e3, "10^3/cumm": 1e3}
_PERCENT = {"%": 1}
_PER_HPF = {"/hpf": 1, "cells/hpf": 1, "per hpf": 1, "hpf": 1, "/h.p.f": 1, "/h.p.f.": 1, "cells/h.p.f": 1}
_PER_LPF = {"/lpf": 1, "per lpf": 1, "lpf": 1, "/l.p.f": 1, "/l.p.f.": 1}
_SECONDS = {"sec": 1, "secs": 1, "second": 1, "seconds": 1, "s": 1}
_MINUTES = {"min": 1, "mins": 1, "minute": 1, "minutes": 1, "sec": 1 / 60, "secs": 1 / 60, "seconds": 1 / 60}

CATALOG: tuple[TestDef, ...] = (
    # Complete blood count
    TestDef(
        "hemoglobin",
        "Haemoglobin",
        "g/dL",
        ("hemoglobin", "haemoglobin", "hb", "hgb"),
        {"g/dl": 1, "gm/dl": 1, "gm%": 1, "g%": 1, "g/l": 0.1},
        loinc="718-7",
        typical=(
            TypicalRange("male", 13, 17),
            TypicalRange("female", 12, 15),
        ),
        typical_source=(
            "Dacie and Lewis Practical Haematology, 12th ed., adult reference ranges (matches "
            "WHO anaemia cut-offs 13/12 g/dL)"
        ),
        recheck_months=1,
        recheck_source=(
            "NICE CKS Anaemia - iron deficiency: check FBC and response 2-4 weeks after "
            "starting iron, then 3-monthly for a year once normal"
        ),
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
        loinc="789-8",
        typical=(
            TypicalRange("male", 4.5, 5.5),
            TypicalRange("female", 3.8, 4.8),
        ),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed., adult reference ranges",
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
        loinc="6690-2",
        typical=(TypicalRange("any", 4000, 10000),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed. (4.0-10.0 x10^9/L)",
    ),
    TestDef(
        "platelets",
        "Platelet count",
        "/µL",
        ("platelet count", "platelets", "plt", "platelet"),
        {**_PER_UL, **_THOUSAND_PER_UL, "lakhs/cumm": 100000, "lakh/cumm": 100000, "lakhs/ul": 100000},
        loinc="777-3",
        typical=(TypicalRange("any", 150000, 410000),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed. (150-410 x10^9/L)",
        recheck_months=1.5,
        recheck_source=(
            "Newcastle upon Tyne Hospitals NHS FT, GP Adult Haematology Guidelines v10 "
            "(2024): platelets 80-150 or 450-800 x10^9/L in a well adult, repeat the blood "
            "count in 4-6 weeks"
        ),
    ),
    TestDef(
        "hematocrit",
        "Haematocrit (PCV)",
        "%",
        ("hematocrit", "haematocrit", "pcv", "packed cell volume", "hct"),
        _PERCENT,
        loinc="4544-3",
        typical=(
            TypicalRange("male", 40, 50),
            TypicalRange("female", 36, 46),
        ),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed. (0.40-0.50 / 0.36-0.46 L/L)",
    ),
    TestDef(
        "mcv",
        "MCV",
        "fL",
        ("mcv", "mean corpuscular volume"),
        {"fl": 1, "cu micron": 1, "µm3": 1},
        loinc="787-2",
        typical=(TypicalRange("any", 83, 101),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed.",
    ),
    TestDef(
        "mch",
        "MCH",
        "pg",
        ("mch", "mean corpuscular hemoglobin", "mean corpuscular haemoglobin"),
        {"pg": 1, "picogram": 1},
        loinc="785-6",
        typical=(TypicalRange("any", 27, 32),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed.",
    ),
    TestDef(
        "mchc",
        "MCHC",
        "g/dL",
        ("mchc", "mean corpuscular hemoglobin concentration", "mean corpuscular haemoglobin concentration"),
        {"g/dl": 1, "gm/dl": 1, "%": 1, "g/l": 0.1},
        loinc="786-4",
        typical=(TypicalRange("any", 31.5, 34.5),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed.",
    ),
    TestDef(
        "rdw",
        "RDW",
        "%",
        ("rdw", "rdw cv", "red cell distribution width"),
        _PERCENT,
        loinc="788-0",
        typical=(TypicalRange("any", 11.6, 14),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed. (RDW-CV)",
    ),
    TestDef(
        "rdw_sd",
        "RDW-SD",
        "fL",
        ("rdw sd", "red cell distribution width sd", "rdw standard deviation"),
        {"fl": 1},
        loinc="115742-9",
        typical=(TypicalRange("any", 39, 46),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed.",
    ),
    TestDef(
        "neutrophils",
        "Neutrophils",
        "%",
        ("neutrophils", "neutrophil", "polymorphs"),
        _PERCENT,
        loinc="770-8",
        typical=(TypicalRange("any", 40, 80),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed.",
    ),
    TestDef(
        "lymphocytes",
        "Lymphocytes",
        "%",
        ("lymphocytes", "lymphocyte"),
        _PERCENT,
        loinc="736-9",
        typical=(TypicalRange("any", 20, 40),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed.",
    ),
    TestDef(
        "monocytes",
        "Monocytes",
        "%",
        ("monocytes", "monocyte"),
        _PERCENT,
        loinc="5905-5",
        typical=(TypicalRange("any", 2, 10),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed.",
    ),
    TestDef(
        "eosinophils",
        "Eosinophils",
        "%",
        ("eosinophils", "eosinophil"),
        _PERCENT,
        loinc="713-8",
        typical=(TypicalRange("any", 1, 6),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed.",
    ),
    TestDef(
        "basophils",
        "Basophils",
        "%",
        ("basophils", "basophil"),
        _PERCENT,
        loinc="706-2",
        typical=(TypicalRange("any", 0, 2),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed. (<1-2%)",
    ),
    TestDef(
        "neutrophils_abs",
        "Absolute neutrophil count",
        "/µL",
        (
            "absolute neutrophil count",
            "absolute neutrophils count",
            "absolute neutrophils",
            "absolute neutrophil",
            "neutrophils absolute",
            "neutrophils absolute count",
            "neutrophil absolute count",
            "neutrophils abs",
            "abs neutrophils",
            "anc",
        ),
        _ABSOLUTE_COUNT,
        loinc="751-8",
        typical=(TypicalRange("any", 2000, 7000),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed. (2.0-7.0 x10^9/L)",
        recheck_months=1,
        recheck_source=(
            "Newcastle upon Tyne Hospitals NHS FT, GP Adult Haematology Guidelines v10 "
            "(2024): neutrophils 1.0-1.49 x10^9/L, rule out secondary causes and repeat in "
            "2-4 weeks"
        ),
    ),
    TestDef(
        "lymphocytes_abs",
        "Absolute lymphocyte count",
        "/µL",
        (
            "absolute lymphocyte count",
            "absolute lymphocytes count",
            "absolute lymphocytes",
            "absolute lymphocyte",
            "lymphocytes absolute",
            "lymphocytes absolute count",
            "lymphocyte absolute count",
            "lymphocytes abs",
            "abs lymphocytes",
            "alc",
        ),
        _ABSOLUTE_COUNT,
        loinc="731-0",
        typical=(TypicalRange("any", 1000, 3000),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed. (1.0-3.0 x10^9/L)",
        recheck_months=1.5,
        recheck_source=(
            "Newcastle upon Tyne Hospitals NHS FT, GP Adult Haematology Guidelines v10 "
            "(2024): lymphocytosis, repeat the FBC in 4-6 weeks to look for resolution"
        ),
    ),
    TestDef(
        "monocytes_abs",
        "Absolute monocyte count",
        "/µL",
        (
            "absolute monocyte count",
            "absolute monocytes count",
            "absolute monocytes",
            "absolute monocyte",
            "monocytes absolute",
            "monocytes absolute count",
            "monocyte absolute count",
            "monocytes abs",
            "abs monocytes",
            "amc",
        ),
        _ABSOLUTE_COUNT,
        loinc="742-7",
        typical=(TypicalRange("any", 200, 1000),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed. (0.2-1.0 x10^9/L)",
    ),
    TestDef(
        "eosinophils_abs",
        "Absolute eosinophil count",
        "/µL",
        (
            "absolute eosinophil count",
            "absolute eosinophils count",
            "absolute eosinophils",
            "absolute eosinophil",
            "eosinophils absolute",
            "eosinophils absolute count",
            "eosinophil absolute count",
            "eosinophils abs",
            "abs eosinophils",
            "aec",
            "total eosinophil count",
            "tec",
        ),
        _ABSOLUTE_COUNT,
        typical=(TypicalRange("any", 20, 500),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed. (0.02-0.5 x10^9/L)",
    ),
    TestDef(
        "basophils_abs",
        "Absolute basophil count",
        "/µL",
        (
            "absolute basophil count",
            "absolute basophils count",
            "absolute basophils",
            "absolute basophil",
            "basophils absolute",
            "basophils absolute count",
            "basophil absolute count",
            "basophils abs",
            "abs basophils",
        ),
        _ABSOLUTE_COUNT,
        loinc="704-7",
        typical=(TypicalRange("any", 20, 100),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed. (0.02-0.1 x10^9/L)",
        recheck_months=1,
        recheck_source=(
            "Newcastle upon Tyne Hospitals NHS FT, GP Adult Haematology Guidelines v10 "
            "(2024): raised basophil count, repeat in 3-4 weeks to see if persistent"
        ),
    ),
    TestDef(
        "esr",
        "ESR",
        "mm/hr",
        ("esr", "erythrocyte sedimentation rate"),
        {"mm/hr": 1, "mm/1st hr": 1, "mm/h": 1, "mm at 1 hr": 1},
        loinc="30341-2",
        typical=(
            TypicalRange("male", 0, 15),
            TypicalRange("female", 0, 20),
        ),
        typical_source="Medscape ESR reference range (Westergren, adults; upper limit rises with age)",
    ),
    TestDef("mpv", "MPV", "fL", ("mpv", "mean platelet volume"), {"fl": 1}, loinc="32623-1"),
    TestDef("pdw", "PDW", "fL", ("platelet distribution width", "pdw sd"), {"fl": 1}, loinc="32207-3"),
    TestDef(
        "plateletcrit",
        "Plateletcrit (PCT)",
        "%",
        ("plateletcrit", "platelet crit", "thrombocrit"),
        {"%": 1, "ml/l": 0.1, "l/l": 100},
        loinc="51637-7",
    ),
    TestDef("p_lcr", "P-LCR", "%", ("p lcr", "plcr", "platelet large cell ratio"), _PERCENT, loinc="48386-7"),
    TestDef(
        "reticulocytes",
        "Reticulocyte count",
        "%",
        (
            "reticulocyte count",
            "reticulocytes",
            "reticulocyte",
            "retic count",
            "retic",
            "reticulocyte percentage",
        ),
        _PERCENT,
        loinc="4679-7",
        typical=(TypicalRange("any", 0.5, 2.5),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed.",
    ),
    TestDef(
        "reticulocytes_abs",
        "Absolute reticulocyte count",
        "/µL",
        (
            "absolute reticulocyte count",
            "absolute reticulocytes",
            "reticulocytes absolute",
            "reticulocyte absolute count",
            "reticulocyte count absolute",
            "absolute retic count",
        ),
        {
            **_PER_UL,
            **_THOUSAND_PER_UL,
            "10^6/ul": 1000000,
            "x10^6/ul": 1000000,
            "million/ul": 1000000,
            "10^12/l": 1000000,
        },
        loinc="60474-4",
        typical=(TypicalRange("any", 50000, 100000),),
        typical_source="Dacie and Lewis Practical Haematology, 12th ed. (50-100 x10^9/L)",
    ),
    TestDef(
        "nrbc",
        "Nucleated RBC (NRBC)",
        "/100 WBC",
        ("nrbc", "nucleated rbc", "nucleated rbcs", "nucleated red blood cells", "nucleated red cells"),
        {"/100 wbc": 1, "per 100 wbc": 1, "/100 leucocytes": 1, "/100 leukocytes": 1, "%": 1},
        loinc="58413-6",
    ),
    TestDef(
        "immature_granulocytes",
        "Immature granulocytes",
        "%",
        ("immature granulocytes", "immature granulocyte", "immature granulocytes percent"),
        _PERCENT,
        loinc="71695-1",
    ),
    TestDef(
        "band_forms",
        "Band forms (stab cells)",
        "%",
        (
            "band forms",
            "band form",
            "band cells",
            "band neutrophils",
            "bands",
            "stab cells",
            "stab forms",
            "neutrophils band forms",
        ),
        _PERCENT,
        loinc="764-1",
    ),
    TestDef(
        "immature_granulocytes_abs",
        "Absolute immature granulocyte count",
        "/µL",
        (
            "absolute immature granulocyte count",
            "absolute immature granulocytes",
            "immature granulocytes absolute",
            "immature granulocyte absolute count",
            "immature granulocytes absolute count",
            "abs immature granulocytes",
            "ig absolute",
        ),
        _ABSOLUTE_COUNT,
        loinc="53115-2",
    ),
    TestDef(
        "nrbc_abs",
        "Absolute nucleated RBC count",
        "/µL",
        (
            "absolute nrbc",
            "absolute nrbc count",
            "nrbc absolute",
            "nrbc absolute count",
            "nucleated rbc absolute",
            "absolute nucleated rbc count",
            "absolute nucleated red cells",
        ),
        _ABSOLUTE_COUNT,
        loinc="771-6",
    ),
    TestDef(
        "granulocytes",
        "Granulocytes",
        "%",
        (
            "granulocytes",
            "granulocyte",
            "granulocyte percentage",
        ),
        _PERCENT,
        loinc="19023-1",
    ),
    TestDef(
        "granulocytes_abs",
        "Absolute granulocyte count",
        "/µL",
        (
            "absolute granulocyte count",
            "absolute granulocytes",
            "granulocytes absolute",
            "granulocyte absolute count",
            "granulocytes absolute count",
            "abs granulocytes",
            "granulocytes abs",
        ),
        _ABSOLUTE_COUNT,
        loinc="20482-6",
    ),
    TestDef(
        "mid_cells",
        "Mid cells (MID)",
        "%",
        (
            "mid cells",
            "mid cell",
            "mixed cells",
            "mixed cell",
            "mid cell percentage",
            "mxd percentage",
        ),
        _PERCENT,
    ),
    TestDef(
        "mid_cells_abs",
        "Absolute mid cell count",
        "/µL",
        (
            "absolute mid cell count",
            "absolute mid cells",
            "mid cells absolute",
            "mid cell absolute count",
            "mid absolute",
            "mxd absolute",
            "absolute mxd count",
            "mixed cells absolute",
        ),
        _ABSOLUTE_COUNT,
    ),
    TestDef(
        "nlr",
        "Neutrophil-lymphocyte ratio (NLR)",
        "ratio",
        (
            "nlr",
            "neutrophil lymphocyte ratio",
            "neutrophil to lymphocyte ratio",
            "neutrophils lymphocytes ratio",
            "n l ratio",
        ),
        {"ratio": 1},
    ),
    TestDef(
        "ipf",
        "Immature platelet fraction (IPF)",
        "%",
        (
            "immature platelet fraction",
            "ipf",
            "immature platelet fraction percent",
        ),
        _PERCENT,
        loinc="71693-6",
    ),
    TestDef(
        "hba2",
        "Haemoglobin A2 (HbA2)",
        "%",
        (
            "hba2",
            "hb a2",
            "haemoglobin a2",
            "hemoglobin a2",
            "hb a2 level",
        ),
        _PERCENT,
        loinc="4551-8",
    ),
    TestDef(
        "hbf",
        "Haemoglobin F (HbF)",
        "%",
        (
            "hbf",
            "hb f",
            "haemoglobin f",
            "hemoglobin f",
            "foetal haemoglobin",
            "fetal hemoglobin",
            "fetal haemoglobin",
        ),
        _PERCENT,
        loinc="4576-5",
        typical=(TypicalRange("any", 0, 0.9),),
        typical_source=(
            "Mayo Clinic Laboratories HGBCE (Hemoglobin Variant, A2 and F Quantitation), age 24 months and "
            "over: HbF 0.0-0.9%"
        ),
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
        loinc="1558-6",
        typical=(TypicalRange("any", 70, 99),),
        typical_source=(
            "ADA Standards of Care, Section 2 (normal fasting plasma glucose <100 mg/dL; 70 "
            "mg/dL hypoglycaemia threshold)"
        ),
        recheck_months=3,
        recheck_source=(
            "ADA Standards of Care, Section 2 (Diagnosis): results near the diagnostic margin "
            "should be repeated in 3-6 months"
        ),
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
        loinc="1521-4",
        typical=(TypicalRange("any", 70, 140),),
        typical_source=(
            "ADA Standards of Care (2-hour glucose <140 mg/dL is normal); 70-140 mg/dL as "
            "printed by major Indian labs"
        ),
    ),
    TestDef(
        "glucose_random",
        "Random blood sugar",
        "mg/dL",
        ("random blood sugar", "rbs", "glucose random", "random glucose", "plasma glucose random"),
        {"mg/dl": 1, "mmol/l": 18.016},
        loinc="2345-7",
        typical=(TypicalRange("any", 70, 140),),
        typical_source=(
            "Reference interval commonly printed by major Indian labs (70-140 mg/dL); ADA: "
            ">=200 mg/dL with symptoms is diagnostic of diabetes"
        ),
    ),
    TestDef(
        "glucose_capillary",
        "Capillary blood sugar (finger-prick)",
        "mg/dL",
        (
            "capillary blood glucose",
            "capillary blood sugar",
            "glucose capillary",
            "capillary glucose",
            "glucometer blood sugar",
            "finger prick blood sugar",
            "fingerstick glucose",
        ),
        {"mg/dl": 1, "mg%": 1, "mmol/l": 18.016},
        loinc="32016-8",
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
        loinc="4548-4",
        typical=(TypicalRange("any", None, 5.6),),
        typical_source=(
            "ADA Standards of Care, Section 2 (normal <5.7%; 5.7-6.4% prediabetes; >=6.5% diabetes)"
        ),
        recheck_months=3,
        recheck_source=(
            "ADA Standards of Care, Section 6 (Glycemic Goals): assess A1C quarterly when "
            "therapy has changed or goals are not met"
        ),
    ),
    TestDef(
        "hba1c_ifcc",
        "HbA1c (IFCC, mmol/mol)",
        "mmol/mol",
        (
            "hba1c ifcc units",
            "hba1c mmol mol",
            "hba1c in mmol mol",
            "hba1c ifcc mmol mol",
        ),
        {"mmol/mol": 1},
        loinc="59261-8",
        typical=(TypicalRange("any", None, 38),),
        typical_source=(
            "ADA Standards of Care, Section 2 (normal A1C <5.7% = <39 mmol/mol; 39-47 mmol/mol prediabetes; "
            ">=48 mmol/mol diabetes)"
        ),
        recheck_months=3,
        recheck_source=(
            "ADA Standards of Care, Section 6 (Glycemic Goals): assess A1C quarterly when therapy has changed"
            " or goals are not met"
        ),
    ),
    TestDef(
        "eag",
        "Estimated average glucose",
        "mg/dL",
        ("estimated average glucose", "eag", "estimated average glucose eag", "estimated mean glucose"),
        {"mg/dl": 1, "mmol/l": 18.016},
        loinc="27353-2",
    ),
    TestDef(
        "glucose_ogtt_1h",
        "Glucose 1 hour after 75 g glucose (OGTT)",
        "mg/dL",
        (
            "1 hr post 75 g glucose",
            "1 hr post 75g glucose",
            "glucose 1 hr after 75 g glucose",
            "glucose 1 hr after 75g glucose",
        ),
        {"mg/dl": 1, "mmol/l": 18.016},
        loinc="1507-3",
    ),
    TestDef(
        "glucose_ogtt_2h",
        "Glucose 2 hours after 75 g glucose (OGTT)",
        "mg/dL",
        (
            "2 hr post 75 g glucose",
            "2 hr post 75g glucose",
            "glucose 2 hr after 75 g glucose",
            "glucose 2 hr after 75g glucose",
        ),
        {"mg/dl": 1, "mmol/l": 18.016},
        loinc="1518-0",
        typical=(TypicalRange("any", None, 139),),
        typical_source=(
            "ADA Standards of Care, Section 2 (2-hour plasma glucose <140 mg/dL normal; "
            "140-199 prediabetes; >=200 diabetes)"
        ),
    ),
    TestDef(
        "glucose_gct_50g",
        "Glucose challenge test (50 g, 1 hour)",
        "mg/dL",
        (
            "glucose challenge test",
            "gct",
            "gct 50 g",
            "gct 50g",
            "50 g glucose challenge test",
            "50g glucose challenge test",
            "glucose challenge test 50 g",
            "glucose challenge test 50g",
            "o sullivan test",
            "1 hr post 50 g glucose",
            "1 hr post 50g glucose",
        ),
        {"mg/dl": 1, "mmol/l": 18.016},
        loinc="1504-0",
    ),
    TestDef(
        "insulin_fasting",
        "Fasting insulin",
        "µIU/mL",
        (
            "fasting insulin",
            "insulin fasting",
            "serum insulin fasting",
            "fasting serum insulin",
            "insulin fasting serum",
            "insulin f",
            "plasma insulin fasting",
        ),
        {"uiu/ml": 1, "miu/l": 1, "mu/l": 1, "uu/ml": 1},
        loinc="27873-9",
        typical=(TypicalRange("any", 2.6, 24.9),),
        typical_source=(
            "Roche Elecsys Insulin assay package insert (fasting 2.6-24.9 µIU/mL); assay-dependent"
        ),
    ),
    TestDef(
        "insulin_pp",
        "Post-meal insulin",
        "µIU/mL",
        (
            "insulin pp",
            "pp insulin",
            "post prandial insulin",
            "insulin post prandial",
            "postprandial insulin",
            "insulin postprandial",
            "serum insulin pp",
            "insulin 2 hr post meal",
            "insulin 2 hours post prandial",
        ),
        {"uiu/ml": 1, "miu/l": 1, "mu/l": 1, "uu/ml": 1},
        loinc="95114-5",
    ),
    TestDef(
        "insulin_random",
        "Random insulin",
        "µIU/mL",
        (
            "random insulin",
            "insulin random",
            "serum insulin random",
            "insulin random serum",
        ),
        {"uiu/ml": 1, "miu/l": 1, "mu/l": 1, "uu/ml": 1},
        loinc="20448-7",
    ),
    TestDef(
        "c_peptide",
        "C-peptide",
        "ng/mL",
        (
            "c peptide",
            "c-peptide",
            "serum c peptide",
            "c peptide fasting",
            "fasting c peptide",
            "c peptide serum",
            "connecting peptide",
        ),
        {"ng/ml": 1, "ug/l": 1, "nmol/l": 3.02, "pmol/l": 0.00302},
        loinc="1986-9",
        typical=(TypicalRange("any", 1.1, 4.4),),
        typical_source="Mayo Clinic Laboratories, C-Peptide, Serum (fasting 1.1-4.4 ng/mL)",
    ),
    TestDef(
        "c_peptide_pp",
        "Post-meal C-peptide",
        "ng/mL",
        (
            "c peptide pp",
            "pp c peptide",
            "post prandial c peptide",
            "c peptide post prandial",
            "c peptide postprandial",
            "postprandial c peptide",
            "c peptide 2 hr post meal",
        ),
        {"ng/ml": 1, "ug/l": 1, "nmol/l": 3.02, "pmol/l": 0.00302},
        loinc="95084-0",
    ),
    TestDef(
        "homa_ir",
        "HOMA-IR (insulin resistance index)",
        "index",
        (
            "homa ir",
            "homa-ir",
            "homa ir index",
            "homa insulin resistance",
            "homeostasis model assessment insulin resistance",
            "homeostatic model assessment of insulin resistance",
            "insulin resistance index homa ir",
        ),
        {},
    ),
    TestDef(
        "fructosamine",
        "Fructosamine",
        "µmol/L",
        ("fructosamine", "serum fructosamine", "fructosamine serum"),
        {"umol/l": 1, "mmol/l": 1000},
        loinc="15069-8",
        typical=(TypicalRange("any", 205, 285),),
        typical_source=(
            "Tietz Textbook of Clinical Chemistry and Molecular Diagnostics (205-285 µmol/L; "
            "Mayo Clinic Laboratories 200-285)"
        ),
    ),
    TestDef(
        "beta_hydroxybutyrate",
        "Beta-hydroxybutyrate (blood ketones)",
        "mmol/L",
        (
            "beta hydroxybutyrate",
            "beta hydroxy butyrate",
            "beta hydroxybutyric acid",
            "b hydroxybutyrate",
            "3 hydroxybutyrate",
            "serum beta hydroxybutyrate",
            "bhb",
        ),
        {"mmol/l": 1, "umol/l": 0.001, "mg/dl": 0.09606},
        loinc="6873-4",
        typical=(TypicalRange("any", None, 0.6),),
        typical_source=(
            "Joint British Diabetes Societies Inpatient Care Group, Management of DKA in adults (blood "
            "ketones <0.6 mmol/L normal; >=3.0 mmol/L in DKA)"
        ),
    ),
    TestDef(
        "anti_gad",
        "Anti-GAD (GAD65) antibodies",
        "IU/mL",
        (
            "anti gad antibody",
            "anti gad antibodies",
            "anti gad 65",
            "anti gad65",
            "anti gad 65 antibodies",
            "gad 65 antibody",
            "gad65 antibody",
            "gad 65 antibodies",
            "gad65 antibodies",
            "gad antibody",
            "glutamic acid decarboxylase antibody",
            "glutamic acid decarboxylase 65 antibody",
            "anti glutamic acid decarboxylase",
        ),
        {"iu/ml": 1},
        loinc="13926-1",
    ),
    # Urine albumin (a kidney check in diabetes)
    TestDef(
        "urine_microalbumin",
        "Urine microalbumin",
        "mg/L",
        (
            "urine microalbumin",
            "microalbumin",
            "microalbumin urine",
            "urinary microalbumin",
            "spot urine microalbumin",
            "micro albumin",
            "urine micro albumin",
            "microalbumin spot urine",
        ),
        {"mg/l": 1, "ug/ml": 1, "mg/dl": 10},
        loinc="14957-5",
    ),
    TestDef(
        "urine_microalbumin_24h",
        "24-hour urine microalbumin",
        "mg/24 hr",
        (
            "24 hr urine microalbumin",
            "24 hrs urine microalbumin",
            "24 hour urine microalbumin",
            "24 hours urine microalbumin",
            "urine microalbumin 24 hr",
            "urine microalbumin 24 hour",
            "urine microalbumin 24 hours",
            "microalbumin 24 hr urine",
            "microalbumin 24 hrs urine",
            "microalbumin 24 hour urine",
            "24 hr urine albumin",
            "24 hour urine albumin",
            "urine albumin 24 hr",
            "urine albumin 24 hours",
        ),
        {
            "mg/24hr": 1,
            "mg/24hrs": 1,
            "mg/24h": 1,
            "mg/24hour": 1,
            "mg/24hours": 1,
            "mg/day": 1,
            "mg/d": 1,
            "ug/min": 1.44,
        },
        loinc="14956-7",
        typical=(TypicalRange("any", None, 30),),
        typical_source=(
            "ADA Standards of Care, Section 11 and KDIGO 2024 (normal albumin excretion <30 mg/24 h; 30-300 "
            "moderately increased)"
        ),
        recheck_months=3,
        recheck_source=(
            "ADA Standards of Care, Section 11 (CKD) and KDIGO 2024: 2 of 3 specimens over 3-6 months must be"
            " abnormal to confirm albuminuria"
        ),
    ),
    TestDef(
        "urine_creatinine",
        "Urine creatinine",
        "mg/dL",
        (
            "urine creatinine",
            "creatinine urine",
            "urinary creatinine",
            "spot urine creatinine",
            "creatinine spot urine",
            "urine creatinine spot",
            "urine creatinine random",
            "creatinine random urine",
        ),
        {"mg/dl": 1, "umol/l": 1 / 88.42, "mmol/l": 11.309658448314861, "g/l": 100, "mg%": 1},
        loinc="2161-8",
    ),
    TestDef(
        "urine_acr",
        "Urine albumin/creatinine ratio (ACR)",
        "mg/g",
        (
            "albumin creatinine ratio",
            "urine albumin creatinine ratio",
            "uacr",
            "acr",
            "urine acr",
            "microalbumin creatinine ratio",
            "urine microalbumin creatinine ratio",
            "microalbumin creatinine ratio urine",
            "albumin creatinine ratio urine",
            "urinary albumin creatinine ratio",
            "ua c ratio",
            "albumin/creatinine ratio",
            "albumin to creatinine ratio",
            "urine albumin/creatinine ratio",
            "microalbumin/creatinine ratio",
            "urine microalbumin/creatinine ratio",
        ),
        {
            "mg/g": 1,
            "mg/gm": 1,
            "mg/g creatinine": 1,
            "mg/gm creatinine": 1,
            "ug/mg": 1,
            "ug/mg creatinine": 1,
            "mg/mmol": 8.84,
            "mg/mmol creatinine": 8.84,
        },
        loinc="9318-7",
        typical=(TypicalRange("any", None, 30),),
        typical_source="KDIGO 2024 CKD guideline and ADA Standards of Care (normal UACR <30 mg/g)",
        recheck_months=3,
        recheck_source=(
            "ADA Standards of Care, Section 11 (CKD) and KDIGO 2024: 2 of 3 UACR specimens "
            "over 3-6 months must be abnormal to confirm"
        ),
    ),
    # Lipid profile
    TestDef(
        "cholesterol_total",
        "Total cholesterol",
        "mg/dL",
        ("total cholesterol", "cholesterol total", "cholesterol", "serum cholesterol", "s cholesterol"),
        {"mg/dl": 1, "mmol/l": 38.67},
        loinc="2093-3",
        typical=(TypicalRange("any", None, 200),),
        typical_source="NCEP ATP III: desirable <200 mg/dL (interval printed by most Indian labs)",
        recheck_months=3,
        recheck_source=(
            "2018 AHA/ACC Cholesterol Guideline: repeat lipid profile 4-12 weeks after "
            "starting lifestyle change or statin, then every 3-12 months; Lipid Association "
            "of India consensus similar"
        ),
    ),
    TestDef(
        "hdl",
        "HDL cholesterol",
        "mg/dL",
        ("hdl", "hdl cholesterol", "cholesterol hdl", "hdl c", "high density lipoprotein"),
        {"mg/dl": 1, "mmol/l": 38.67},
        loinc="2085-9",
        typical=(
            TypicalRange("male", 40, None),
            TypicalRange("female", 50, None),
        ),
        typical_source="NCEP ATP III (metabolic syndrome criteria): low HDL <40 mg/dL men, <50 mg/dL women",
        recheck_months=3,
        recheck_source=(
            "2018 AHA/ACC Cholesterol Guideline: repeat lipid profile 4-12 weeks after "
            "starting lifestyle change or statin"
        ),
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
        loinc="2089-1",
        typical=(TypicalRange("any", None, 100),),
        typical_source="NCEP ATP III: optimal <100 mg/dL",
        recheck_months=3,
        recheck_source=(
            "2018 AHA/ACC Cholesterol Guideline: repeat lipid profile 4-12 weeks after "
            "starting lifestyle change or statin; ESC/EAS 2019: 8 (+/-4) weeks after starting "
            "or adjusting therapy"
        ),
    ),
    TestDef(
        "vldl",
        "VLDL cholesterol",
        "mg/dL",
        ("vldl", "vldl cholesterol", "very low density lipoprotein"),
        {"mg/dl": 1, "mmol/l": 38.67},
        loinc="2091-7",
        recheck_months=3,
        recheck_source=(
            "2018 AHA/ACC Cholesterol Guideline: repeat lipid profile 4-12 weeks after starting lifestyle "
            "change or statin"
        ),
    ),
    TestDef(
        "triglycerides",
        "Triglycerides",
        "mg/dL",
        ("triglycerides", "triglyceride", "tg", "serum triglycerides"),
        {"mg/dl": 1, "mmol/l": 88.57},
        loinc="2571-8",
        typical=(TypicalRange("any", None, 150),),
        typical_source="NCEP ATP III: normal <150 mg/dL",
        recheck_months=3,
        recheck_source=(
            "2018 AHA/ACC Cholesterol Guideline: repeat lipid profile 4-12 weeks after "
            "starting lifestyle change or statin"
        ),
    ),
    TestDef(
        "non_hdl",
        "Non-HDL cholesterol",
        "mg/dL",
        (
            "non hdl cholesterol",
            "non hdl",
            "non hdl c",
            "nonhdl cholesterol",
            "nonhdl",
            "cholesterol non hdl",
            "non high density lipoprotein cholesterol",
        ),
        {"mg/dl": 1, "mg%": 1, "mmol/l": 38.67},
        loinc="43396-1",
        typical=(TypicalRange("any", None, 130),),
        typical_source="NCEP ATP III: non-HDL goal <130 mg/dL (LDL goal + 30)",
        recheck_months=3,
        recheck_source=(
            "2018 AHA/ACC Cholesterol Guideline: repeat lipid profile 4-12 weeks after "
            "starting therapy; Lipid Association of India uses non-HDL as a co-primary target"
        ),
    ),
    TestDef(
        "chol_hdl_ratio",
        "Total cholesterol/HDL ratio",
        "ratio",
        (
            "tc hdl ratio",
            "tc hdl",
            "total cholesterol hdl ratio",
            "total cholesterol hdl cholesterol ratio",
            "total cholesterol to hdl ratio",
            "cholesterol hdl ratio",
            "chol hdl ratio",
            "cholesterol to hdl ratio",
            "t chol hdl ratio",
            "tc hdl c ratio",
        ),
        {"ratio": 1},
        loinc="9830-1",
        typical=(TypicalRange("any", None, 5),),
        typical_source=(
            "Common laboratory interval (e.g. Mayo Clinic Laboratories; most Indian labs print 3.5-5.0, >5 "
            "indicates higher risk)"
        ),
        recheck_months=3,
        recheck_source=(
            "Computed from the lipid profile; 2018 AHA/ACC Cholesterol Guideline repeat interval of 4-12 "
            "weeks after starting therapy"
        ),
    ),
    TestDef(
        "ldl_hdl_ratio",
        "LDL/HDL ratio",
        "ratio",
        (
            "ldl hdl ratio",
            "ldl hdl",
            "ldl c hdl c ratio",
            "ldl cholesterol hdl cholesterol ratio",
            "ldl to hdl ratio",
            "ldl hdl cholesterol ratio",
        ),
        {"ratio": 1},
        loinc="11054-4",
        recheck_months=3,
        recheck_source=(
            "Computed from the lipid profile; 2018 AHA/ACC Cholesterol Guideline repeat "
            "interval of 4-12 weeks after starting therapy"
        ),
    ),
    TestDef(
        "hdl_ldl_ratio",
        "HDL/LDL ratio",
        "ratio",
        (
            "hdl ldl ratio",
            "hdl ldl",
            "hdl c ldl c ratio",
            "hdl cholesterol ldl cholesterol ratio",
            "hdl to ldl ratio",
            "hdl ldl cholesterol ratio",
        ),
        {"ratio": 1},
        loinc="16616-5",
        recheck_months=3,
        recheck_source=(
            "Computed from the lipid profile; 2018 AHA/ACC Cholesterol Guideline repeat interval of 4-12 "
            "weeks after starting therapy"
        ),
    ),
    TestDef(
        "trig_hdl_ratio",
        "Triglycerides/HDL ratio",
        "ratio",
        (
            "tg hdl ratio",
            "tg hdl",
            "trig hdl ratio",
            "trig hdl",
            "triglyceride hdl ratio",
            "triglycerides hdl ratio",
            "triglyceride hdl cholesterol ratio",
            "triglycerides hdl cholesterol ratio",
            "tg hdl c ratio",
            "triglyceride to hdl ratio",
            "triglycerides to hdl ratio",
        ),
        {"ratio": 1},
        loinc="44733-4",
        recheck_months=3,
        recheck_source=(
            "Computed from the lipid profile; 2018 AHA/ACC Cholesterol Guideline repeat interval of 4-12 "
            "weeks after starting therapy"
        ),
    ),
    TestDef(
        "lipoprotein_a",
        "Lipoprotein (a)",
        "mg/dL",
        ("lipoprotein a", "lipoprotein little a", "lp a", "lpa", "lp little a", "serum lipoprotein a"),
        {"mg/dl": 1, "mg%": 1, "mg/l": 0.1, "g/l": 100},
        loinc="10835-7",
        typical=(TypicalRange("any", None, 30),),
        typical_source=(
            "EAS 2022 Lp(a) consensus statement (Kronenberg et al., Eur Heart J 2022): <30 mg/dL (<75 nmol/L)"
            " rules out raised risk; most Indian labs print <30 mg/dL. Lp(a) is genetically fixed, so "
            "guidelines advise measuring once rather than rechecking. nmol/L results cannot be converted with"
            " a fixed factor and are deliberately not listed"
        ),
    ),
    TestDef(
        "apo_a1",
        "Apolipoprotein A1",
        "mg/dL",
        (
            "apolipoprotein a1",
            "apolipoprotein a 1",
            "apolipoprotein a i",
            "apolipoprotein ai",
            "apo a1",
            "apo a 1",
            "apoa1",
            "apo ai",
            "apo a i",
            "apoa i",
        ),
        {"mg/dl": 1, "mg%": 1, "g/l": 100, "mg/l": 0.1},
        loinc="1869-7",
        typical=(
            TypicalRange("male", 104, 202),
            TypicalRange("female", 108, 225),
        ),
        typical_source=(
            "Roche Tina-quant Apolipoprotein A-1 ver.2 package insert adult reference interval (assay used by"
            " many Indian labs, e.g. printed by Thyrocare)"
        ),
    ),
    TestDef(
        "apo_b",
        "Apolipoprotein B",
        "mg/dL",
        (
            "apolipoprotein b",
            "apolipoprotein b 100",
            "apolipoprotein b100",
            "apo b",
            "apob",
            "apo b 100",
            "apo b100",
            "apob 100",
            "apob100",
        ),
        {"mg/dl": 1, "mg%": 1, "g/l": 100, "mg/l": 0.1},
        loinc="1884-6",
        recheck_months=3,
        recheck_source=(
            "ESC/EAS 2019 Dyslipidaemia Guidelines: re-evaluate lipids (ApoB is a secondary "
            "target) 8 (+/-4) weeks after starting or adjusting therapy"
        ),
    ),
    TestDef(
        "apob_apoa1_ratio",
        "Apo B/Apo A1 ratio",
        "ratio",
        (
            "apo b apo a1 ratio",
            "apob apoa1 ratio",
            "apo b apo a 1 ratio",
            "apo b apo a i ratio",
            "apo b a1 ratio",
            "apob a1 ratio",
            "apolipoprotein b apolipoprotein a1 ratio",
            "apolipoprotein b a1 ratio",
            "apo b apo a1",
        ),
        {"ratio": 1},
        loinc="1874-7",
    ),
    TestDef(
        "small_dense_ldl",
        "Small dense LDL cholesterol",
        "mg/dL",
        (
            "small dense ldl",
            "small dense ldl cholesterol",
            "small dense ldl c",
            "sdldl",
            "sd ldl",
            "sdldl c",
            "sd ldl c",
            "sdldl cholesterol",
            "ldl small dense",
        ),
        {"mg/dl": 1, "mg%": 1, "mmol/l": 38.67},
        loinc="90364-1",
    ),
    TestDef(
        "total_lipids",
        "Total lipids",
        "mg/dL",
        (
            "total lipids",
            "total lipid",
            "serum total lipids",
            "lipids total",
        ),
        {"mg/dl": 1, "mg%": 1, "g/l": 100},
        loinc="2569-2",
    ),
    # Liver
    TestDef(
        "bilirubin_total",
        "Total bilirubin",
        "mg/dL",
        ("total bilirubin", "bilirubin total", "bilirubin", "serum bilirubin total"),
        {"mg/dl": 1, "umol/l": 1 / 17.1},
        loinc="1975-2",
        typical=(TypicalRange("any", 0.1, 1.2),),
        typical_source="MedlinePlus Medical Encyclopedia, Bilirubin blood test (US NLM)",
    ),
    TestDef(
        "bilirubin_direct",
        "Direct bilirubin",
        "mg/dL",
        ("direct bilirubin", "bilirubin direct", "conjugated bilirubin", "bilirubin conjugated"),
        {"mg/dl": 1, "umol/l": 1 / 17.1},
        loinc="1968-7",
        typical=(TypicalRange("any", 0, 0.3),),
        typical_source="MedlinePlus Medical Encyclopedia, Bilirubin blood test (US NLM)",
    ),
    TestDef(
        "bilirubin_indirect",
        "Indirect bilirubin",
        "mg/dL",
        ("indirect bilirubin", "bilirubin indirect", "serum bilirubin indirect"),
        {"mg/dl": 1, "mg%": 1, "umol/l": 1 / 17.1},
        loinc="1971-1",
    ),
    TestDef(
        "delta_bilirubin",
        "Delta bilirubin",
        "mg/dL",
        (
            "delta bilirubin",
            "bilirubin delta",
            "serum delta bilirubin",
            "delta bilirubin serum",
        ),
        {"mg/dl": 1, "mg%": 1, "umol/l": 1 / 17.1},
        loinc="1970-3",
    ),
    TestDef(
        "ast",
        "AST (SGOT)",
        "U/L",
        ("ast", "sgot", "aspartate aminotransferase", "ast sgot", "sgot ast"),
        {"u/l": 1, "iu/l": 1},
        loinc="1920-8",
        typical=(
            TypicalRange("male", None, 40),
            TypicalRange("female", None, 32),
        ),
        typical_source="Roche cobas ASTL method sheet (IFCC, 37 C), the interval most Indian labs print",
        recheck_months=3,
        recheck_source=(
            "ACG Clinical Guideline: Evaluation of Abnormal Liver Chemistries (Kwo et al., Am J Gastroenterol"
            " 2017), Figure 1: borderline/mild AST/ALT elevation, consider observation for 3 (to 6) months "
            "with repeat AST/ALT, ALP and bilirubin"
        ),
    ),
    TestDef(
        "alt",
        "ALT (SGPT)",
        "U/L",
        ("alt", "sgpt", "alanine aminotransferase", "alt sgpt", "sgpt alt"),
        {"u/l": 1, "iu/l": 1},
        loinc="1742-6",
        typical=(
            TypicalRange("male", None, 41),
            TypicalRange("female", None, 33),
        ),
        typical_source=(
            "Roche cobas ALTL method sheet (IFCC, 37 C), the interval most Indian labs print (ACG 2017 "
            "healthy ULN is lower: 29-33 men, 19-25 women)"
        ),
        recheck_months=3,
        recheck_source=(
            "ACG Clinical Guideline: Evaluation of Abnormal Liver Chemistries (Kwo et al., Am J Gastroenterol"
            " 2017), Figure 1: borderline/mild AST/ALT elevation, consider observation for 3 (to 6) months "
            "with repeat AST/ALT, ALP and bilirubin"
        ),
    ),
    TestDef(
        "ast_alt_ratio",
        "AST/ALT (SGOT/SGPT) ratio",
        "ratio",
        ("sgot sgpt ratio", "sgot/sgpt ratio", "ast alt ratio", "ast/alt ratio", "de ritis ratio"),
        {"ratio": 1},
        loinc="1916-6",
    ),
    TestDef(
        "alp",
        "Alkaline phosphatase",
        "U/L",
        ("alkaline phosphatase", "alp", "serum alkaline phosphatase"),
        {"u/l": 1, "iu/l": 1},
        loinc="6768-6",
        typical=(
            TypicalRange("male", 40, 129),
            TypicalRange("female", 35, 104),
        ),
        typical_source=(
            "Roche cobas ALP2 method sheet (IFCC, 37 C), adult interval widely printed by Indian labs"
        ),
        recheck_months=6,
        recheck_source=(
            "ACG Clinical Guideline: Evaluation of Abnormal Liver Chemistries (Kwo et al., Am J Gastroenterol"
            " 2017), Figure 4: ALP 1-2x ULN with negative AMA, consider observation; if still raised after 6 "
            "months, investigate further"
        ),
    ),
    TestDef(
        "ggt",
        "GGT",
        "U/L",
        ("ggt", "gamma gt", "gamma glutamyl transferase", "ggtp"),
        {"u/l": 1, "iu/l": 1},
        loinc="2324-2",
        typical=(
            TypicalRange("male", 10, 71),
            TypicalRange("female", 6, 42),
        ),
        typical_source="Roche cobas GGT-2 method sheet (IFCC, 37 C)",
    ),
    TestDef(
        "nucleotidase_5",
        "5'-Nucleotidase",
        "U/L",
        (
            "5' nucleotidase",
            "5 nucleotidase",
            "5'nucleotidase",
            "5'-nucleotidase",
            "serum 5' nucleotidase",
            "5' nucleotidase serum",
            "5'nt",
            "5' nt",
        ),
        {"u/l": 1, "iu/l": 1},
        loinc="1690-7",
    ),
    TestDef(
        "total_protein",
        "Total protein",
        "g/dL",
        ("total protein", "serum total protein", "protein total"),
        {"g/dl": 1, "gm/dl": 1, "g/l": 0.1},
        loinc="2885-2",
        typical=(TypicalRange("any", 6, 8.3),),
        typical_source="MedlinePlus Medical Encyclopedia, Total protein (US NLM)",
    ),
    TestDef(
        "albumin",
        "Albumin",
        "g/dL",
        ("albumin", "serum albumin"),
        {"g/dl": 1, "gm/dl": 1, "g/l": 0.1},
        loinc="1751-7",
        typical=(TypicalRange("any", 3.4, 5.4),),
        typical_source="MedlinePlus Medical Encyclopedia, Albumin blood test (US NLM)",
    ),
    TestDef(
        "globulin",
        "Globulin",
        "g/dL",
        ("globulin", "serum globulin", "globulins", "total globulin"),
        {"g/dl": 1, "gm/dl": 1, "gm%": 1, "g%": 1, "g/l": 0.1},
        loinc="10834-0",
        typical=(TypicalRange("any", 2, 3.5),),
        typical_source="MedlinePlus Medical Encyclopedia, Serum globulin (US NLM)",
    ),
    TestDef(
        "ag_ratio",
        "A/G ratio",
        "ratio",
        (
            "a/g ratio",
            "a g ratio",
            "ag ratio",
            "a:g ratio",
            "albumin globulin ratio",
            "albumin/globulin ratio",
            "albumin to globulin ratio",
        ),
        {"ratio": 1},
        loinc="1759-0",
    ),
    TestDef(
        "prealbumin",
        "Prealbumin (transthyretin)",
        "mg/dL",
        (
            "prealbumin",
            "pre albumin",
            "pre-albumin",
            "serum prealbumin",
            "prealbumin serum",
            "transthyretin",
        ),
        {"mg/dl": 1, "mg%": 1, "g/l": 100, "mg/l": 0.1},
        loinc="14338-8",
    ),
    TestDef(
        "ldh",
        "LDH (lactate dehydrogenase)",
        "U/L",
        ("lactic dehydrogenase", "serum ldh", "ldh total", "total ldh", "lactate dehydrogenase total"),
        {"u/l": 1, "iu/l": 1, "ukat/l": 60},
    ),
    TestDef(
        "ammonia",
        "Ammonia",
        "µmol/L",
        (
            "ammonia",
            "plasma ammonia",
            "serum ammonia",
            "blood ammonia",
            "ammonia plasma",
            "ammonia nh3",
            "nh3",
        ),
        {"umol/l": 1, "µmol/l": 1, "ug/dl": 0.5872, "mcg/dl": 0.5872},
        loinc="16362-6",
    ),
    TestDef(
        "bile_acids_total",
        "Total bile acids",
        "µmol/L",
        (
            "total bile acids",
            "bile acids total",
            "bile acids",
            "serum bile acids",
            "serum total bile acids",
            "total bile acid",
            "bile acid total",
        ),
        {"umol/l": 1, "µmol/l": 1},
        loinc="14628-2",
    ),
    # Kidney
    TestDef(
        "urea",
        "Urea",
        "mg/dL",
        ("urea", "blood urea", "serum urea"),
        {"mg/dl": 1, "mmol/l": 6.006},
        loinc="3091-6",
        typical=(TypicalRange("any", 13, 43),),
        typical_source=(
            "Tietz Textbook of Laboratory Medicine (BUN 6-20 mg/dL x 2.14 = urea about 13-43 mg/dL)"
        ),
    ),
    TestDef(
        "bun",
        "Blood urea nitrogen",
        "mg/dL",
        ("bun", "blood urea nitrogen", "urea nitrogen"),
        {"mg/dl": 1, "mmol/l": 2.801},
        loinc="3094-0",
        typical=(TypicalRange("any", 6, 20),),
        typical_source="Tietz Textbook of Laboratory Medicine (adult serum BUN 6-20 mg/dL)",
    ),
    TestDef(
        "creatinine",
        "Creatinine",
        "mg/dL",
        ("creatinine", "serum creatinine", "s creatinine"),
        {"mg/dl": 1, "umol/l": 1 / 88.42},
        loinc="2160-0",
        typical=(
            TypicalRange("male", 0.74, 1.35),
            TypicalRange("female", 0.59, 1.04),
        ),
        typical_source=(
            "Mayo Clinic Laboratories test catalog, Creatinine, Serum (males >=15 y "
            "0.74-1.35; females >=16 y 0.59-1.04 mg/dL)"
        ),
        recheck_months=3,
        recheck_source=(
            "KDIGO 2024 CKD guideline: kidney abnormality must persist >3 months, so a raised "
            "creatinine/low eGFR is repeated to confirm chronicity at about 3 months (NICE "
            "NG203 advises repeating within 2 weeks first to exclude acute kidney injury)"
        ),
    ),
    TestDef(
        "egfr",
        "eGFR",
        "mL/min/1.73m²",
        ("egfr", "estimated gfr", "estimated glomerular filtration rate"),
        {"ml/min/1.73m2": 1, "ml/min/1.73 m2": 1, "ml/min/1.73m²": 1, "ml/min": 1},
        recheck_months=3,
        recheck_source=(
            "KDIGO 2024 CKD guideline: GFR <60 must persist >3 months to define CKD; repeat at about 3 months"
            " (NICE NG203: repeat within 2 weeks first if a new drop, to exclude AKI)"
        ),
    ),
    TestDef(
        "uric_acid",
        "Uric acid",
        "mg/dL",
        ("uric acid", "serum uric acid", "s uric acid"),
        {"mg/dl": 1, "umol/l": 1 / 59.48},
        loinc="3084-1",
        typical=(
            TypicalRange("male", 3.5, 7.2),
            TypicalRange("female", 2.6, 6),
        ),
        typical_source="Tietz Textbook of Laboratory Medicine (uricase method, adult)",
    ),
    TestDef(
        "bun_creatinine_ratio",
        "BUN/creatinine ratio",
        "ratio",
        (
            "bun creatinine ratio",
            "bun/creatinine ratio",
            "bun / creatinine ratio",
            "bun:creatinine ratio",
            "bun to creatinine ratio",
            "bun/sr. creatinine ratio",
            "bun / sr. creatinine ratio",
            "bun sr creatinine ratio",
            "bun creat ratio",
            "urea nitrogen creatinine ratio",
            "urea nitrogen/creatinine ratio",
        ),
        {"ratio": 1, ":1": 1},
        loinc="3097-3",
        typical=(TypicalRange("any", 10, 20),),
        typical_source=(
            "Tietz Textbook of Laboratory Medicine / Merck Manual (BUN:creatinine about 10:1 to 20:1)"
        ),
    ),
    TestDef(
        "urea_creatinine_ratio",
        "Urea/creatinine ratio",
        "ratio",
        (
            "urea creatinine ratio",
            "urea/creatinine ratio",
            "urea / creatinine ratio",
            "urea:creatinine ratio",
            "urea to creatinine ratio",
            "urea/sr. creatinine ratio",
            "urea / sr. creatinine ratio",
            "urea sr creatinine ratio",
            "serum urea creatinine ratio",
            "urea creat ratio",
        ),
        {"ratio": 1, ":1": 1},
        loinc="56997-0",
    ),
    # Electrolytes and minerals
    TestDef(
        "sodium",
        "Sodium",
        "mmol/L",
        ("sodium", "serum sodium", "na", "na+"),
        {"mmol/l": 1, "meq/l": 1},
        loinc="2951-2",
        typical=(TypicalRange("any", 136, 145),),
        typical_source="Tietz Textbook of Laboratory Medicine (adult serum 136-145 mmol/L)",
    ),
    TestDef(
        "potassium",
        "Potassium",
        "mmol/L",
        ("potassium", "serum potassium", "k", "k+"),
        {"mmol/l": 1, "meq/l": 1},
        loinc="2823-3",
        typical=(TypicalRange("any", 3.5, 5.1),),
        typical_source="Tietz Textbook of Laboratory Medicine (adult serum 3.5-5.1 mmol/L)",
    ),
    TestDef(
        "chloride",
        "Chloride",
        "mmol/L",
        ("chloride", "serum chloride", "cl", "cl-"),
        {"mmol/l": 1, "meq/l": 1},
        loinc="2075-0",
        typical=(TypicalRange("any", 98, 107),),
        typical_source="Tietz Textbook of Laboratory Medicine (adult serum 98-107 mmol/L)",
    ),
    TestDef(
        "bicarbonate",
        "Bicarbonate",
        "mmol/L",
        (
            "bicarbonate",
            "serum bicarbonate",
            "s bicarbonate",
            "plasma bicarbonate",
            "bicarbonate hco3",
            "bicarb",
        ),
        {"mmol/l": 1, "meq/l": 1},
        loinc="1963-8",
        typical=(TypicalRange("any", 22, 29),),
        typical_source="Tietz Textbook of Laboratory Medicine (adult venous serum 22-29 mmol/L)",
    ),
    TestDef(
        "total_co2",
        "Total CO2",
        "mmol/L",
        (
            "total co2",
            "co2 total",
            "total carbon dioxide",
            "carbon dioxide total",
            "serum total co2",
            "total co2 content",
        ),
        {"mmol/l": 1, "meq/l": 1},
        loinc="2028-9",
        typical=(TypicalRange("any", 23, 29),),
        typical_source="Tietz Textbook of Laboratory Medicine (adult venous serum total CO2 23-29 mmol/L)",
    ),
    TestDef(
        "calcium",
        "Calcium",
        "mg/dL",
        ("calcium", "serum calcium", "total calcium", "ca"),
        {"mg/dl": 1, "mmol/l": 4.008},
        loinc="17861-6",
        typical=(TypicalRange("any", 8.6, 10),),
        typical_source=(
            "Mayo Clinic Laboratories test catalog, Calcium, Total, Serum (18-59 y 8.6-10.0 "
            "mg/dL; >=60 y 8.8-10.2 mg/dL)"
        ),
    ),
    TestDef(
        "calcium_corrected",
        "Corrected calcium (albumin-adjusted)",
        "mg/dL",
        (
            "corrected calcium",
            "calcium corrected",
            "corrected serum calcium",
            "serum calcium corrected",
            "albumin corrected calcium",
            "albumin adjusted calcium",
            "calcium corrected for albumin",
            "calcium albumin corrected",
        ),
        {"mg/dl": 1, "mg%": 1, "mmol/l": 4.008},
        loinc="46099-8",
    ),
    TestDef(
        "calcium_ionized",
        "Ionised calcium",
        "mmol/L",
        (
            "ionised calcium",
            "ionized calcium",
            "calcium ionised",
            "calcium ionized",
            "serum ionised calcium",
            "serum ionized calcium",
            "ionic calcium",
            "free calcium",
            "ica",
        ),
        {"mmol/l": 1, "mg/dl": 1 / 4.008, "meq/l": 0.5},
        loinc="1995-0",
        typical=(TypicalRange("any", 1.14, 1.35),),
        typical_source=(
            "Mayo Clinic Laboratories test catalog, Calcium, Ionized, Serum (adults 4.57-5.43 "
            "mg/dL = 1.14-1.35 mmol/L)"
        ),
    ),
    TestDef(
        "phosphorus",
        "Phosphorus",
        "mg/dL",
        (
            "phosphorus",
            "serum phosphorus",
            "s phosphorus",
            "inorganic phosphorus",
            "phosphorus inorganic",
            "phosphorous",
            "serum phosphorous",
            "inorganic phosphorous",
            "phosphate",
            "serum phosphate",
            "inorganic phosphate",
        ),
        {"mg/dl": 1, "mg%": 1, "mmol/l": 3.097},
        loinc="2777-1",
        typical=(TypicalRange("any", 2.5, 4.5),),
        typical_source=(
            "Tietz Textbook of Laboratory Medicine (adult serum inorganic phosphorus 2.5-4.5 mg/dL)"
        ),
    ),
    TestDef(
        "magnesium",
        "Magnesium",
        "mg/dL",
        ("magnesium", "serum magnesium", "s magnesium", "plasma magnesium"),
        {"mg/dl": 1, "mg%": 1, "mmol/l": 2.431, "meq/l": 1.215},
        loinc="19123-9",
        typical=(TypicalRange("any", 1.7, 2.3),),
        typical_source="Mayo Clinic Laboratories test catalog, Magnesium, Serum (>17 y 1.7-2.3 mg/dL)",
    ),
    TestDef(
        "anion_gap",
        "Anion gap",
        "mmol/L",
        ("anion gap", "serum anion gap", "anion gap calculated"),
        {"mmol/l": 1, "meq/l": 1},
        loinc="33037-3",
    ),
    TestDef(
        "cystatin_c",
        "Cystatin C",
        "mg/L",
        ("cystatin c", "serum cystatin c", "cystatin"),
        {"mg/l": 1, "ug/ml": 1},
        loinc="33863-2",
    ),
    TestDef(
        "osmolality_serum",
        "Serum osmolality",
        "mOsm/kg",
        (
            "osmolality plasma",
            "serum osmolality measured",
            "measured serum osmolality",
        ),
        {"mosm/kg": 1, "mosm/kg h2o": 1, "mosmol/kg": 1, "mmol/kg": 1},
        loinc="2692-2",
        typical=(TypicalRange("any", 275, 295),),
        typical_source="MedlinePlus Medical Encyclopedia, Osmolality blood test (US NLM): 275-295 mOsm/kg",
    ),
    TestDef(
        "osmolality_urine",
        "Urine osmolality",
        "mOsm/kg",
        (
            "urine osmolality",
            "osmolality urine",
            "urinary osmolality",
            "spot urine osmolality",
            "urine osmolality random",
        ),
        {"mosm/kg": 1, "mosm/kg h2o": 1, "mosmol/kg": 1, "mmol/kg": 1},
        loinc="2695-5",
    ),
    TestDef(
        "urine_sodium",
        "Urine sodium",
        "mmol/L",
        (
            "urine sodium",
            "sodium urine",
            "urinary sodium",
            "spot urine sodium",
            "sodium spot urine",
            "urine sodium spot",
            "urine sodium random",
            "sodium random urine",
            "urine na",
        ),
        {"mmol/l": 1, "meq/l": 1},
        loinc="2955-3",
    ),
    TestDef(
        "urine_potassium",
        "Urine potassium",
        "mmol/L",
        (
            "urine potassium",
            "potassium urine",
            "urinary potassium",
            "spot urine potassium",
            "potassium spot urine",
            "urine potassium spot",
            "urine potassium random",
            "potassium random urine",
            "urine k",
        ),
        {"mmol/l": 1, "meq/l": 1},
        loinc="2828-2",
    ),
    TestDef(
        "urine_chloride",
        "Urine chloride",
        "mmol/L",
        (
            "urine chloride",
            "chloride urine",
            "urinary chloride",
            "spot urine chloride",
            "chloride spot urine",
            "urine chloride spot",
            "urine chloride random",
            "chloride random urine",
            "urine cl",
        ),
        {"mmol/l": 1, "meq/l": 1},
        loinc="2078-4",
    ),
    TestDef(
        "urine_protein_24h",
        "24-hour urine protein",
        "mg/24 hr",
        (
            "24 hour urine protein",
            "24 hr urine protein",
            "24 hrs urine protein",
            "24h urine protein",
            "urine protein 24 hour",
            "urine protein 24 hours",
            "urine protein 24 hr",
            "urine protein 24 hrs",
            "24 hour urinary protein",
            "urinary protein 24 hours",
            "urine total protein 24 hrs",
            "total protein 24 hour urine",
            "protein 24 hour urine",
            "24 hour urine total protein",
        ),
        {
            "mg/24 hr": 1,
            "mg/24 hrs": 1,
            "mg/24h": 1,
            "mg/24 hours": 1,
            "mg/day": 1,
            "mg/d": 1,
            "g/24 hr": 1000,
            "g/24 hrs": 1000,
            "g/24h": 1000,
            "gm/24 hr": 1000,
            "gm/24 hrs": 1000,
            "g/day": 1000,
            "g/d": 1000,
        },
        loinc="2889-4",
        typical=(TypicalRange("any", None, 150),),
        typical_source=(
            "MedlinePlus Medical Encyclopedia, Protein urine test (24-hour collection 30-150 mg per 24 hours)"
        ),
        recheck_months=3,
        recheck_source=(
            "KDIGO 2024 CKD guideline: proteinuria must persist >3 months to define CKD, so an abnormal "
            "result is confirmed on repeat over about 3 months"
        ),
    ),
    TestDef(
        "urine_pcr",
        "Urine protein/creatinine ratio (PCR)",
        "mg/mg",
        (
            "urine protein creatinine ratio",
            "urine protein/creatinine ratio",
            "protein creatinine ratio",
            "protein/creatinine ratio",
            "protein to creatinine ratio",
            "urine protein to creatinine ratio",
            "urinary protein creatinine ratio",
            "spot urine protein creatinine ratio",
            "upcr",
            "upc ratio",
        ),
        {
            "mg/mg": 1,
            "g/g": 1,
            "ratio": 1,
            "mg/mg creatinine": 1,
            "mg/g": 0.001,
            "mg/gm": 0.001,
            "mg/g creatinine": 0.001,
            "mg/mmol": 0.00884,
            "mg/mmol creatinine": 0.00884,
        },
        loinc="2890-2",
        typical=(TypicalRange("any", None, 0.15),),
        typical_source="KDIGO 2024 CKD guideline proteinuria categories (normal PCR <150 mg/g = <0.15 mg/mg)",
        recheck_months=3,
        recheck_source=(
            "KDIGO 2024 CKD guideline: raised PCR (>=150 mg/g) must persist >3 months to define CKD; repeat "
            "to confirm over about 3 months"
        ),
    ),
    TestDef(
        "urine_creatinine_24h",
        "24-hour urine creatinine",
        "mg/24 hr",
        (
            "24 hour urine creatinine",
            "24 hr urine creatinine",
            "24 hrs urine creatinine",
            "24h urine creatinine",
            "urine creatinine 24 hour",
            "urine creatinine 24 hours",
            "urine creatinine 24 hr",
            "urine creatinine 24 hrs",
            "creatinine 24 hour urine",
            "24 hour urinary creatinine",
        ),
        {
            "mg/24 hr": 1,
            "mg/24 hrs": 1,
            "mg/24h": 1,
            "mg/day": 1,
            "mg/d": 1,
            "g/24 hr": 1000,
            "g/24 hrs": 1000,
            "g/24h": 1000,
            "g/day": 1000,
            "mmol/24 hr": 1000 / 8.842,
            "mmol/24h": 1000 / 8.842,
            "mmol/day": 1000 / 8.842,
        },
        loinc="2162-6",
    ),
    TestDef(
        "creatinine_clearance",
        "Creatinine clearance (24-hour)",
        "mL/min",
        (
            "creatinine clearance",
            "creatinine clearance 24 hour",
            "creatinine clearance 24 hr",
            "24 hour creatinine clearance",
            "24 hr creatinine clearance",
            "24 hrs creatinine clearance",
            "measured creatinine clearance",
            "creatinine clearance test",
        ),
        {"ml/min": 1, "ml/s": 60},
        loinc="2164-2",
        typical=(
            TypicalRange("male", 97, 137),
            TypicalRange("female", 88, 128),
        ),
        typical_source=(
            "MedlinePlus Medical Encyclopedia, Creatinine clearance test (US NLM): males 97-137 mL/min, "
            "females 88-128 mL/min"
        ),
    ),
    # Thyroid
    TestDef(
        "tsh",
        "TSH",
        "µIU/mL",
        ("tsh", "thyroid stimulating hormone", "tsh ultrasensitive", "ultrasensitive tsh"),
        {"uiu/ml": 1, "miu/l": 1, "mu/l": 1, "uu/ml": 1},
        loinc="3016-3",
        typical=(TypicalRange("any", 0.45, 4.12),),
        typical_source=(
            "NHANES III disease-free reference population (Hollowell et al. 2002), cited in "
            "AACE/ATA 2012 hypothyroidism guideline"
        ),
        recheck_months=3,
        recheck_source=(
            "NICE NG145 Thyroid disease (2019): repeat TSH with FT4 about 3 months after a "
            "subclinical out-of-range result; ATA 2014 hypothyroidism guideline: recheck 6-8 "
            "weeks after a levothyroxine dose change"
        ),
    ),
    TestDef(
        "t3_total",
        "T3 (total)",
        "ng/dL",
        ("t3", "total t3", "t3 total", "triiodothyronine", "total triiodothyronine"),
        {"ng/dl": 1, "nmol/l": 65.1, "ng/ml": 100},
        loinc="3053-6",
        typical=(TypicalRange("any", 80, 200),),
        typical_source="Roche Elecsys T3 method sheet (0.8-2.0 ng/mL), widely used by Indian labs",
    ),
    TestDef(
        "t4_total",
        "T4 (total)",
        "µg/dL",
        ("t4", "total t4", "t4 total", "thyroxine", "total thyroxine"),
        {"ug/dl": 1, "nmol/l": 1 / 12.87},
        loinc="3026-2",
        typical=(TypicalRange("any", 5.1, 14.1),),
        typical_source="Roche Elecsys T4 method sheet (66-181 nmol/L)",
    ),
    TestDef(
        "ft3",
        "Free T3",
        "pg/mL",
        ("ft3", "free t3", "free triiodothyronine"),
        {"pg/ml": 1, "pmol/l": 0.651},
        loinc="3051-0",
        typical=(TypicalRange("any", 2, 4.4),),
        typical_source="Roche Elecsys FT3 III method sheet (3.1-6.8 pmol/L)",
    ),
    TestDef(
        "ft4",
        "Free T4",
        "ng/dL",
        ("ft4", "free t4", "free thyroxine"),
        {"ng/dl": 1, "pmol/l": 1 / 12.87},
        loinc="3024-7",
        typical=(TypicalRange("any", 0.93, 1.7),),
        typical_source="Roche Elecsys FT4 III method sheet (12-22 pmol/L)",
        recheck_months=3,
        recheck_source=(
            "NICE NG145 Thyroid disease (2019): repeat TSH and FT4 about 3 months after a "
            "subclinical out-of-range result"
        ),
    ),
    TestDef(
        "thyroglobulin",
        "Thyroglobulin",
        "ng/mL",
        ("thyroglobulin", "serum thyroglobulin", "thyroglobulin tg"),
        {"ng/ml": 1, "ug/l": 1},
        loinc="3013-0",
    ),
    # Other hormones
    TestDef(
        "prolactin",
        "Prolactin",
        "ng/mL",
        ("serum prolactin", "s prolactin", "prl", "prolactin prl"),
        {"ng/ml": 1, "ug/l": 1, "uiu/ml": 1 / 21.2, "miu/l": 1 / 21.2, "mu/l": 1 / 21.2},
        loinc="2842-3",
        typical=(
            TypicalRange("male", 4.04, 15.2),
            TypicalRange("female", 4.79, 23.3),
        ),
        typical_source=(
            "Roche Elecsys Prolactin II method sheet (WHO 3rd IS 84/500, 1 ng/mL = 21.2 "
            "µIU/mL); non-pregnant women"
        ),
    ),
    TestDef(
        "testosterone_total",
        "Testosterone (total)",
        "ng/dL",
        ("total testosterone", "testosterone total", "serum testosterone", "s testosterone"),
        {"ng/dl": 1, "ng/ml": 100, "ug/l": 100, "nmol/l": 28.84},
        loinc="2986-8",
        typical=(TypicalRange("male", 264, 916),),
        typical_source=(
            "Endocrine Society 2018 testosterone therapy guideline (CDC-harmonised range, "
            "Travison et al. 2017), men 19-39 years"
        ),
    ),
    TestDef(
        "testosterone_free",
        "Free testosterone",
        "pg/mL",
        ("free testosterone", "testosterone free"),
        {"pg/ml": 1, "ng/l": 1, "ng/dl": 10, "pmol/l": 0.2884},
        loinc="2991-8",
    ),
    TestDef(
        "shbg",
        "SHBG",
        "nmol/L",
        ("shbg", "sex hormone binding globulin", "serum shbg"),
        {"nmol/l": 1},
        loinc="13967-5",
    ),
    TestDef(
        "oestradiol",
        "Oestradiol (E2)",
        "pg/mL",
        (
            "oestradiol",
            "estradiol",
            "e2",
            "oestradiol e2",
            "estradiol e2",
            "serum estradiol",
            "serum oestradiol",
            "17 beta estradiol",
            "17 beta oestradiol",
        ),
        {"pg/ml": 1, "ng/l": 1, "pmol/l": 0.2724},
        loinc="2243-4",
    ),
    TestDef(
        "lh",
        "LH",
        "mIU/mL",
        ("lh", "luteinizing hormone", "luteinising hormone", "serum lh", "lh luteinizing hormone"),
        {"miu/ml": 1, "mu/ml": 1, "iu/l": 1, "u/l": 1},
        loinc="10501-5",
        typical=(TypicalRange("male", 1.7, 8.6),),
        typical_source=(
            "Roche Elecsys LH method sheet (adult men); female range depends on cycle phase and menopause"
        ),
    ),
    TestDef(
        "fsh",
        "FSH",
        "mIU/mL",
        ("fsh", "follicle stimulating hormone", "serum fsh", "fsh follicle stimulating hormone"),
        {"miu/ml": 1, "mu/ml": 1, "iu/l": 1, "u/l": 1},
        loinc="15067-2",
        typical=(TypicalRange("male", 1.5, 12.4),),
        typical_source=(
            "Roche Elecsys FSH method sheet (adult men); female range depends on cycle phase and menopause"
        ),
    ),
    TestDef(
        "progesterone",
        "Progesterone",
        "ng/mL",
        ("progesterone", "serum progesterone", "day 21 progesterone", "progesterone day 21"),
        {"ng/ml": 1, "ug/l": 1, "nmol/l": 0.3145},
        loinc="2839-9",
    ),
    TestDef(
        "amh",
        "AMH (Anti-Müllerian hormone)",
        "ng/mL",
        (
            "amh",
            "anti mullerian hormone",
            "anti müllerian hormone",
            "antimullerian hormone",
            "anti mullerian hormone amh",
            "mullerian inhibiting substance",
        ),
        {"ng/ml": 1, "ug/l": 1, "pmol/l": 0.1401},
        loinc="38476-8",
    ),
    TestDef(
        "cortisol",
        "Cortisol",
        "µg/dL",
        ("serum cortisol", "s cortisol"),
        {"ug/dl": 1, "ng/ml": 0.1, "ug/l": 0.1, "nmol/l": 0.03625},
        loinc="2143-6",
    ),
    TestDef(
        "acth",
        "ACTH",
        "pg/mL",
        (
            "acth",
            "adrenocorticotropic hormone",
            "adrenocorticotrophic hormone",
            "corticotropin",
            "plasma acth",
        ),
        {"pg/ml": 1, "ng/l": 1, "pmol/l": 4.541},
        loinc="2141-0",
    ),
    TestDef(
        "dhea_s",
        "DHEA-S",
        "µg/dL",
        (
            "dhea s",
            "dheas",
            "dhea so4",
            "dhea sulphate",
            "dhea sulfate",
            "dehydroepiandrosterone sulphate",
            "dehydroepiandrosterone sulfate",
        ),
        {"ug/dl": 1, "ug/ml": 100, "ng/ml": 0.1, "umol/l": 36.85},
        loinc="2191-5",
    ),
    TestDef(
        "hydroxyprogesterone_17",
        "17-OH progesterone",
        "ng/mL",
        (
            "17 oh progesterone",
            "17 ohp",
            "17 hydroxyprogesterone",
            "17 hydroxy progesterone",
            "17 alpha hydroxyprogesterone",
            "17 alpha hydroxy progesterone",
        ),
        {"ng/ml": 1, "ug/l": 1, "ng/dl": 0.01, "nmol/l": 0.3305},
        loinc="1668-3",
    ),
    TestDef(
        "androstenedione",
        "Androstenedione",
        "ng/mL",
        (
            "androstenedione",
            "serum androstenedione",
            "delta 4 androstenedione",
            "androstenedione a4",
        ),
        {"ng/ml": 1, "ug/l": 1, "ng/dl": 0.01, "nmol/l": 0.2864},
        loinc="1854-9",
    ),
    TestDef(
        "aldosterone",
        "Aldosterone",
        "ng/dL",
        (
            "aldosterone",
            "serum aldosterone",
            "plasma aldosterone",
            "plasma aldosterone concentration",
            "aldosterone serum",
            "aldosterone plasma",
        ),
        {"ng/dl": 1, "pg/ml": 0.1, "ng/l": 0.1, "pmol/l": 0.03604},
        loinc="1763-2",
    ),
    TestDef(
        "renin_activity",
        "Plasma renin activity",
        "ng/mL/h",
        (
            "plasma renin activity",
            "renin activity",
            "renin activity plasma",
            "plasma renin activity pra",
        ),
        {"ng/ml/h": 1, "ng/ml/hr": 1, "ng/ml/hour": 1, "ug/l/h": 1, "ug/l/hr": 1},
        loinc="2915-7",
    ),
    TestDef(
        "pth",
        "PTH (intact)",
        "pg/mL",
        (
            "intact pth",
            "pth intact",
            "ipth",
            "parathyroid hormone",
            "parathyroid hormone intact",
            "intact parathyroid hormone",
            "parathormone",
            "serum pth",
        ),
        {"pg/ml": 1, "ng/l": 1, "pmol/l": 9.425},
        loinc="2731-8",
        typical=(TypicalRange("any", 15, 65),),
        typical_source="Roche Elecsys PTH method sheet (1.6-6.9 pmol/L), widely used by Indian labs",
    ),
    TestDef(
        "calcitonin",
        "Calcitonin",
        "pg/mL",
        ("calcitonin", "serum calcitonin"),
        {"pg/ml": 1, "ng/l": 1, "pmol/l": 3.418},
        loinc="1992-7",
    ),
    TestDef(
        "growth_hormone",
        "Growth hormone",
        "ng/mL",
        ("growth hormone", "gh", "hgh", "human growth hormone", "somatotropin", "serum growth hormone"),
        {"ng/ml": 1, "ug/l": 1},
        loinc="2963-7",
    ),
    TestDef(
        "igf1",
        "IGF-1",
        "ng/mL",
        (
            "igf 1",
            "igf1",
            "igf i",
            "insulin like growth factor 1",
            "insulin like growth factor i",
            "somatomedin c",
        ),
        {"ng/ml": 1, "ug/l": 1, "nmol/l": 7.649},
        loinc="2484-4",
    ),
    TestDef(
        "beta_hcg",
        "Beta hCG",
        "mIU/mL",
        (
            "beta hcg",
            "b hcg",
            "bhcg",
            "total beta hcg",
            "beta hcg total",
            "serum beta hcg",
            "beta hcg quantitative",
            "beta human chorionic gonadotropin",
            "human chorionic gonadotropin",
        ),
        {"miu/ml": 1, "mu/ml": 1, "iu/l": 1, "u/l": 1},
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
        loinc="62292-8",
    ),
    TestDef(
        "vitamin_b12",
        "Vitamin B12",
        "pg/mL",
        ("vitamin b12", "vit b12", "cyanocobalamin", "b12"),
        {"pg/ml": 1, "pmol/l": 1.355},
        loinc="2132-9",
        typical=(TypicalRange("any", 180, 914),),
        typical_source="Mayo Clinic Laboratories adult reference interval (180-914 ng/L = pg/mL)",
    ),
    TestDef(
        "ferritin",
        "Ferritin",
        "ng/mL",
        ("ferritin", "serum ferritin"),
        {"ng/ml": 1, "ug/l": 1},
        loinc="2276-4",
        typical=(
            TypicalRange("male", 24, 336),
            TypicalRange("female", 11, 307),
        ),
        typical_source="Mayo Clinic Laboratories adult reference interval",
    ),
    TestDef(
        "iron",
        "Iron",
        "µg/dL",
        ("iron", "serum iron"),
        {"ug/dl": 1, "umol/l": 5.585},
        loinc="2498-4",
        typical=(
            TypicalRange("male", 65, 175),
            TypicalRange("female", 50, 170),
        ),
        typical_source="Tietz Clinical Guide to Laboratory Tests (adult serum iron)",
    ),
    TestDef(
        "tibc",
        "Total Iron Binding Capacity (TIBC)",
        "µg/dL",
        (
            "tibc",
            "total iron binding capacity",
            "serum tibc",
            "tibc serum",
            "iron binding capacity total",
            "total iron binding capacity tibc",
        ),
        {"ug/dl": 1, "umol/l": 5.585},
        loinc="2500-7",
        typical=(TypicalRange("any", 250, 425),),
        typical_source="Tietz Clinical Guide to Laboratory Tests (adult TIBC 250-425 µg/dL)",
    ),
    TestDef(
        "uibc",
        "Unsaturated Iron Binding Capacity (UIBC)",
        "µg/dL",
        (
            "uibc",
            "unsaturated iron binding capacity",
            "unbound iron binding capacity",
            "serum uibc",
            "uibc serum",
        ),
        {"ug/dl": 1, "umol/l": 5.585},
        loinc="2501-5",
    ),
    TestDef(
        "transferrin_saturation",
        "Transferrin Saturation",
        "%",
        (
            "transferrin saturation",
            "percent transferrin saturation",
            "transferrin saturation percent",
            "saturation of transferrin",
            "tsat",
            "iron saturation",
            "serum iron saturation",
        ),
        _PERCENT,
        loinc="2502-3",
        typical=(
            TypicalRange("male", 20, 50),
            TypicalRange("female", 15, 50),
        ),
        typical_source="Tietz Clinical Guide to Laboratory Tests (adult transferrin saturation)",
    ),
    TestDef(
        "transferrin",
        "Transferrin",
        "mg/dL",
        ("transferrin", "serum transferrin", "transferrin serum"),
        {"mg/dl": 1, "mg%": 1, "g/l": 100},
        loinc="3034-6",
        typical=(TypicalRange("any", 200, 360),),
        typical_source="Roche Tina-quant Transferrin assay adult reference interval (2.0-3.6 g/L)",
    ),
    TestDef(
        "soluble_transferrin_receptor",
        "Soluble Transferrin Receptor (sTfR)",
        "mg/L",
        (
            "soluble transferrin receptor",
            "stfr",
            "s tfr",
            "serum transferrin receptor",
            "transferrin receptor soluble",
            "serum soluble transferrin receptor",
        ),
        {"mg/l": 1, "ug/ml": 1},
        loinc="30248-9",
    ),
    TestDef(
        "folate",
        "Folate (Folic Acid)",
        "ng/mL",
        ("folate", "serum folate", "folate serum", "folic acid serum", "s folate", "vitamin b9", "vit b9"),
        {"ng/ml": 1, "ug/l": 1, "nmol/l": 0.4413},
        loinc="2284-8",
        typical=(TypicalRange("any", 4, None),),
        typical_source=(
            "Mayo Clinic Laboratories (serum folate >=4.0 ng/mL); consistent with WHO 2015 "
            "serum folate deficiency cut-off of ~10 nmol/L"
        ),
    ),
    TestDef(
        "rbc_folate",
        "RBC Folate",
        "ng/mL",
        (
            "rbc folate",
            "red cell folate",
            "red blood cell folate",
            "folate rbc",
            "erythrocyte folate",
            "folate red cell",
        ),
        {"ng/ml": 1, "ug/l": 1, "nmol/l": 0.4413},
        loinc="2283-0",
    ),
    TestDef(
        "vitamin_d_1_25",
        "1,25-Dihydroxy Vitamin D",
        "pg/mL",
        (
            "1 25 dihydroxy vitamin d",
            "1 25 dihydroxyvitamin d",
            "1 25 oh 2 vitamin d",
            "1 25 oh vitamin d",
            "1 25 vitamin d",
            "vitamin d 1 25 dihydroxy",
            "calcitriol",
        ),
        {"pg/ml": 1, "ng/l": 1, "pmol/l": 0.4166},
        loinc="62290-2",
    ),
    TestDef(
        "vitamin_b12_active",
        "Active B12 (Holotranscobalamin)",
        "pmol/L",
        (
            "active b12",
            "active vitamin b12",
            "holotranscobalamin",
            "holo transcobalamin",
            "holo tc",
            "holotc",
        ),
        {"pmol/l": 1},
        loinc="72160-5",
    ),
    TestDef(
        "zinc",
        "Zinc",
        "µg/dL",
        ("zinc", "serum zinc", "zinc serum", "zn"),
        {"ug/dl": 1, "ug/ml": 100, "mg/l": 100, "umol/l": 6.538},
        loinc="5763-8",
        typical=(TypicalRange("any", 70, 120),),
        typical_source="Tietz Clinical Guide to Laboratory Tests (adult serum zinc)",
    ),
    TestDef(
        "copper",
        "Copper",
        "µg/dL",
        ("copper", "serum copper", "copper serum", "cu"),
        {"ug/dl": 1, "ug/ml": 100, "mg/l": 100, "umol/l": 6.355},
        loinc="5631-7",
        typical=(
            TypicalRange("male", 70, 140),
            TypicalRange("female", 80, 155),
        ),
        typical_source="Tietz Clinical Guide to Laboratory Tests (adult serum copper)",
    ),
    TestDef(
        "ceruloplasmin",
        "Caeruloplasmin",
        "mg/dL",
        (
            "ceruloplasmin",
            "caeruloplasmin",
            "serum ceruloplasmin",
            "serum caeruloplasmin",
            "ceruloplasmin serum",
            "caeruloplasmin serum",
        ),
        {"mg/dl": 1, "mg%": 1, "g/l": 100, "mg/l": 0.1},
        loinc="2064-4",
    ),
    TestDef(
        "selenium",
        "Selenium",
        "µg/L",
        (
            "selenium",
            "serum selenium",
            "selenium serum",
            "plasma selenium",
        ),
        {"ug/l": 1, "ng/ml": 1, "ug/dl": 10, "umol/l": 78.97},
        loinc="5724-0",
    ),
    TestDef(
        "methylmalonic_acid",
        "Methylmalonic Acid (MMA)",
        "nmol/L",
        (
            "methylmalonic acid",
            "methyl malonic acid",
            "serum methylmalonic acid",
            "methylmalonic acid serum",
            "methylmalonate",
            "mma",
        ),
        {"nmol/l": 1, "nmol/ml": 1000, "umol/l": 1000},
        loinc="13964-2",
        typical=(TypicalRange("any", None, 400),),
        typical_source="Mayo Clinic Laboratories test catalog, Methylmalonic Acid, Serum (<=0.40 nmol/mL)",
    ),
    TestDef(
        "vitamin_a",
        "Vitamin A (Retinol)",
        "µg/dL",
        ("vitamin a", "vit a", "retinol", "serum retinol", "vitamin a retinol"),
        {"ug/dl": 1, "ug/ml": 100, "mg/l": 100, "ng/ml": 0.1, "umol/l": 28.65},
        loinc="2923-1",
        typical=(TypicalRange("any", 32.5, 78),),
        typical_source="Mayo Clinic Laboratories adult reference interval (0.325-0.78 mcg/mL)",
    ),
    TestDef(
        "vitamin_e",
        "Vitamin E (Alpha Tocopherol)",
        "mg/L",
        ("vitamin e", "vit e", "alpha tocopherol", "vitamin e alpha tocopherol"),
        {"mg/l": 1, "ug/ml": 1, "mg/dl": 10, "umol/l": 0.4307},
        loinc="1823-4",
        typical=(TypicalRange("any", 5.5, 17),),
        typical_source="Mayo Clinic Laboratories adult reference interval (alpha-tocopherol 5.5-17.0 mg/L)",
    ),
    TestDef(
        "vitamin_c",
        "Vitamin C (Ascorbic Acid)",
        "mg/dL",
        ("vitamin c", "vit c", "serum ascorbic acid"),
        {"mg/dl": 1, "mg%": 1, "mg/l": 0.1, "ug/ml": 0.1, "umol/l": 0.01761},
        loinc="1903-4",
        typical=(TypicalRange("any", 0.4, 2),),
        typical_source="Mayo Clinic Laboratories adult reference interval (0.4-2.0 mg/dL)",
    ),
    TestDef(
        "vitamin_b6",
        "Vitamin B6",
        "ng/mL",
        ("vitamin b6", "vit b6", "pyridoxal phosphate", "pyridoxal 5 phosphate", "pyridoxine", "plp"),
        {"ng/ml": 1, "ug/l": 1},
        loinc="30552-4",
    ),
    TestDef(
        "vitamin_b1",
        "Vitamin B1 (Thiamine)",
        "ng/mL",
        ("vitamin b1", "vit b1", "thiamine", "thiamin"),
        {"ng/ml": 1, "ug/l": 1},
    ),
    # Inflammation, heart and other blood tests
    TestDef(
        "crp",
        "CRP",
        "mg/L",
        ("crp", "c reactive protein", "hs crp", "hscrp"),
        {"mg/l": 1, "mg/dl": 10},
        loinc="1988-5",
    ),
    TestDef(
        "troponin_i",
        "Troponin I",
        "ng/L",
        (
            "troponin i",
            "trop i",
            "tropi",
            "tni",
            "ctni",
            "cardiac troponin i",
            "troponin i cardiac",
            "hs troponin i",
            "hs trop i",
            "hs tni",
            "hstni",
            "hs ctni",
            "troponin i hs",
            "high sensitivity troponin i",
            "high sensitive troponin i",
            "high sensitivity cardiac troponin i",
        ),
        {"ng/l": 1, "pg/ml": 1, "ng/ml": 1000, "ug/l": 1000},
        loinc="10839-9",
    ),
    TestDef(
        "troponin_t",
        "Troponin T",
        "ng/L",
        (
            "troponin t",
            "trop t",
            "tropt",
            "tnt",
            "ctnt",
            "cardiac troponin t",
            "troponin t cardiac",
            "hs troponin t",
            "hs trop t",
            "hs tnt",
            "hstnt",
            "hs ctnt",
            "troponin t hs",
            "high sensitivity troponin t",
            "high sensitive troponin t",
            "high sensitivity cardiac troponin t",
        ),
        {"ng/l": 1, "pg/ml": 1, "ng/ml": 1000, "ug/l": 1000},
        loinc="6598-7",
        typical=(TypicalRange("any", None, 14),),
        typical_source=(
            "Roche Elecsys Troponin T hs assay (the only cTnT manufacturer): 99th percentile upper reference "
            "limit 14 ng/L, used in ESC 2023 ACS guideline 0/1h algorithm"
        ),
    ),
    TestDef(
        "ck",
        "Creatine kinase (CPK)",
        "U/L",
        (
            "creatine kinase",
            "creatine phosphokinase",
            "ck total",
            "total ck",
            "cpk total",
            "total cpk",
            "ck nac",
            "cpk nac",
            "serum cpk",
            "serum creatine kinase",
        ),
        {"u/l": 1, "iu/l": 1, "ukat/l": 60},
        loinc="2157-6",
        typical=(
            TypicalRange("male", 39, 308),
            TypicalRange("female", 26, 192),
        ),
        typical_source=(
            "Mayo Clinic Laboratories / Roche CK (IFCC, 37 C) assay insert: males 39-308 U/L, females 26-192 "
            "U/L"
        ),
    ),
    TestDef(
        "ck_mb",
        "CK-MB",
        "U/L",
        ("creatine kinase mb isoenzyme", "ck mb activity", "cpk mb activity"),
        {"u/l": 1, "iu/l": 1, "ukat/l": 60},
        loinc="32673-6",
    ),
    TestDef(
        "ck_mb_mass",
        "CK-MB mass",
        "ng/mL",
        ("ck mb mass", "ckmb mass", "cpk mb mass", "creatine kinase mb mass"),
        {"ng/ml": 1, "ug/l": 1},
        loinc="13969-1",
    ),
    TestDef("myoglobin", "Myoglobin", "ng/mL", ("serum myoglobin",), {"ng/ml": 1, "ug/l": 1}, loinc="2639-3"),
    TestDef(
        "nt_probnp",
        "NT-proBNP",
        "pg/mL",
        (
            "nt probnp",
            "nt pro bnp",
            "ntprobnp",
            "nt pro b type natriuretic peptide",
            "n terminal pro bnp",
            "n terminal probnp",
            "n terminal pro b type natriuretic peptide",
            "pro bnp",
            "probnp",
        ),
        {"pg/ml": 1, "ng/l": 1},
        loinc="33762-6",
    ),
    TestDef(
        "bnp",
        "BNP",
        "pg/mL",
        ("bnp", "b type natriuretic peptide", "brain natriuretic peptide", "natriuretic peptide b"),
        {"pg/ml": 1, "ng/l": 1},
        loinc="30934-4",
    ),
    TestDef(
        "homocysteine",
        "Homocysteine",
        "µmol/L",
        (
            "homocysteine",
            "serum homocysteine",
            "plasma homocysteine",
            "total homocysteine",
            "homocysteine total",
            "hcy",
        ),
        {"umol/l": 1},
        loinc="13965-9",
        typical=(TypicalRange("any", 5, 15),),
        typical_source=(
            "Refsum et al., Facts and recommendations about total homocysteine "
            "determinations, Clinical Chemistry 2004 (adult fasting tHcy 5-15 µmol/L)"
        ),
    ),
    TestDef(
        "d_dimer",
        "D-dimer",
        "ng/mL FEU",
        (
            "d dimer",
            "ddimer",
            "fibrin d dimer",
            "d dimer quantitative",
            "plasma d dimer",
            "d dimer test",
            "quantitative d dimer",
        ),
        {
            "ng/ml feu": 1,
            "ng feu/ml": 1,
            "ug/l feu": 1,
            "ug feu/l": 1,
            "ug/ml feu": 1000,
            "ug feu/ml": 1000,
            "mg/l feu": 1000,
            "mg feu/l": 1000,
        },
        loinc="48065-7",
        typical=(TypicalRange("any", None, 500),),
        typical_source=(
            "Mayo Clinic Laboratories D-dimer (≤500 ng/mL FEU), the common 0.5 µg/mL FEU assay cut-off"
        ),
    ),
    TestDef(
        "psa_total",
        "PSA (total)",
        "ng/mL",
        (
            "total psa",
            "psa total",
            "tpsa",
            "serum psa",
            "prostate specific antigen",
            "total prostate specific antigen",
            "prostate specific antigen total",
        ),
        {"ng/ml": 1, "ug/l": 1},
        loinc="2857-1",
        typical=(TypicalRange("male", 0, 4),),
        typical_source=(
            "Conventional upper limit 4.0 ng/mL (Mayo Clinic Laboratories; Tietz Textbook of Clinical "
            "Chemistry)"
        ),
        recheck_months=1.5,
        recheck_source=(
            "EAU Guidelines on Prostate Cancer: a raised PSA should be repeated after a few weeks under "
            "standardised conditions before further work-up; UK Prostate Cancer Risk Management Programme: "
            "repeat about 6 weeks after treating a urinary infection"
        ),
    ),
    TestDef(
        "psa_free",
        "PSA (free)",
        "ng/mL",
        ("fpsa", "free prostate specific antigen", "prostate specific antigen free"),
        {"ng/ml": 1, "ug/l": 1},
        loinc="10886-0",
    ),
    TestDef(
        "psa_free_ratio",
        "Free PSA ratio",
        "%",
        (
            "free psa ratio",
            "free to total psa ratio",
            "free total psa ratio",
            "free total psa",
            "psa free total ratio",
            "free psa total psa ratio",
            "free psa percentage",
            "percent free psa",
            "f t psa ratio",
        ),
        _PERCENT,
        loinc="12841-3",
    ),
    TestDef(
        "amylase",
        "Amylase",
        "U/L",
        ("serum amylase", "amylase serum", "s amylase"),
        {"u/l": 1, "iu/l": 1, "ukat/l": 60},
        loinc="1798-8",
    ),
    TestDef(
        "lipase",
        "Lipase",
        "U/L",
        ("serum lipase", "lipase serum", "s lipase"),
        {"u/l": 1, "iu/l": 1, "ukat/l": 60},
        loinc="3040-3",
    ),
    TestDef(
        "rheumatoid_factor",
        "Rheumatoid factor",
        "IU/mL",
        (
            "rheumatoid factor",
            "ra factor",
            "rf quantitative",
            "ra factor quantitative",
            "rheumatoid factor quantitative",
            "ra quantitative",
            "serum rheumatoid factor",
        ),
        {"iu/ml": 1, "u/ml": 1, "kiu/l": 1, "ku/l": 1},
        loinc="11572-5",
    ),
    TestDef(
        "aso",
        "ASO titre",
        "IU/mL",
        (
            "aso",
            "asot",
            "aso titre",
            "aso titer",
            "aso quantitative",
            "anti streptolysin o",
            "antistreptolysin o",
            "anti streptolysin o titre",
            "anti streptolysin o titer",
            "antistreptolysin o titre",
        ),
        {"iu/ml": 1, "u/ml": 1, "kiu/l": 1},
        loinc="5370-2",
        typical=(TypicalRange("any", None, 200),),
        typical_source=(
            "Roche ASLO immunoturbidimetric assay insert, adult upper limit 200 IU/mL (used "
            "by most Indian labs)"
        ),
    ),
    TestDef(
        "procalcitonin",
        "Procalcitonin",
        "ng/mL",
        ("procalcitonin", "serum procalcitonin", "procalcitonin pct"),
        {"ng/ml": 1, "ug/l": 1},
        loinc="33959-8",
    ),
    TestDef(
        "anti_ccp",
        "Anti-CCP antibody",
        "U/mL",
        (
            "anti ccp",
            "anti ccp antibody",
            "anti ccp antibodies",
            "anti ccp igg",
            "anti cyclic citrullinated peptide",
            "anti cyclic citrullinated peptide antibody",
            "anti cyclic citrullinated peptide antibodies",
            "cyclic citrullinated peptide antibody",
            "ccp antibody",
            "acpa",
        ),
        {"u/ml": 1},
        loinc="32218-0",
    ),
    TestDef(
        "interleukin_6",
        "Interleukin-6 (IL-6)",
        "pg/mL",
        (
            "interleukin 6",
            "interleukin6",
            "il 6",
            "il6",
            "serum interleukin 6",
            "interleukin 6 serum",
            "il 6 serum",
            "serum il 6",
        ),
        {"pg/ml": 1, "ng/l": 1},
        loinc="26881-3",
    ),
    # Urine routine
    TestDef(
        "urine_ph",
        "Urine pH",
        "pH",
        ("urine ph", "ph urine", "ph of urine", "urinary ph", "urine reaction ph"),
        {"ph": 1},
        loinc="5803-2",
        typical=(TypicalRange("any", 4.5, 8),),
        typical_source=(
            "Strasinger & Di Lorenzo, Urinalysis and Body Fluids; Henry's Clinical Diagnosis "
            "and Management by Laboratory Methods (random urine pH 4.5-8.0)"
        ),
    ),
    TestDef(
        "urine_specific_gravity",
        "Urine specific gravity",
        "",
        (
            "urine specific gravity",
            "specific gravity urine",
            "urine sp gravity",
            "urine sp gr",
            "urinary specific gravity",
        ),
        {},
        loinc="5811-5",
        typical=(TypicalRange("any", 1.005, 1.03),),
        typical_source="Strasinger & Di Lorenzo, Urinalysis and Body Fluids (random urine 1.005-1.030)",
    ),
    TestDef(
        "urine_protein",
        "Urine protein",
        "mg/dL",
        (
            "urine protein",
            "protein urine",
            "urine proteins",
            "proteins urine",
            "protein albumin",
            "urine protein albumin",
            "protein albumin urine",
            "urine protein dipstick",
        ),
        {"mg/dl": 1, "mg%": 1, "g/l": 100, "gm/l": 100, "mg/l": 0.1},
        loinc="5804-0",
        recheck_months=3,
        recheck_source=(
            "KDIGO 2024 CKD Guideline: confirm persistent proteinuria/albuminuria on repeat "
            "testing over 3 months (quantify with urine ACR/PCR)"
        ),
    ),
    TestDef(
        "urine_glucose",
        "Urine glucose",
        "mg/dL",
        (
            "urine glucose",
            "glucose urine",
            "urine sugar",
            "sugar urine",
            "urinary glucose",
            "urine glucose dipstick",
            "glucose in urine",
        ),
        {
            "mg/dl": 1,
            "mg%": 1,
            "mmol/l": 18.016,
            "g/dl": 1000,
            "gm/dl": 1000,
            "g%": 1000,
            "gm%": 1000,
            "g/l": 100,
        },
        loinc="5792-7",
    ),
    TestDef(
        "urine_ketones",
        "Urine ketones",
        "mg/dL",
        (
            "urine ketones",
            "ketones urine",
            "urine ketone",
            "ketone urine",
            "urine ketone bodies",
            "acetone urine",
            "urine acetone",
        ),
        {"mg/dl": 1, "mg%": 1},
        loinc="5797-6",
    ),
    TestDef(
        "urine_pus_cells",
        "Pus cells (urine)",
        "/hpf",
        ("urine pus cells", "pus cells urine", "urine wbc", "wbc urine"),
        _PER_HPF,
        loinc="5821-4",
        typical=(TypicalRange("any", 0, 5),),
        typical_source="Strasinger & Di Lorenzo, Urinalysis and Body Fluids (0-5 WBC/hpf)",
    ),
    TestDef(
        "urine_rbc",
        "Red blood cells (urine)",
        "/hpf",
        (
            "urine rbc",
            "rbc urine",
            "urine rbcs",
            "rbcs urine",
            "urine red blood cells",
            "red blood cells urine",
            "urine red cells",
            "red cells urine",
        ),
        _PER_HPF,
        loinc="13945-1",
        typical=(TypicalRange("any", 0, 2),),
        typical_source=(
            "Strasinger & Di Lorenzo, Urinalysis and Body Fluids (0-2 RBC/hpf); AUA 2020 "
            "defines microhematuria as >=3 RBC/hpf"
        ),
        recheck_months=6,
        recheck_source=(
            "AUA/SUFU Microhematuria Guideline 2020 (low-risk patients with >=3 RBC/hpf may "
            "repeat urinalysis within 6 months)"
        ),
    ),
    TestDef(
        "urine_epithelial_cells",
        "Epithelial cells (urine)",
        "/hpf",
        ("urine epithelial cells", "epithelial cells urine"),
        _PER_HPF,
        loinc="5787-7",
    ),
    TestDef(
        "urine_hyaline_casts",
        "Hyaline casts (urine)",
        "/lpf",
        ("hyaline casts", "hyaline cast", "urine hyaline casts", "hyaline casts urine"),
        _PER_LPF,
        loinc="5796-8",
        typical=(TypicalRange("any", 0, 2),),
        typical_source="Strasinger & Di Lorenzo, Urinalysis and Body Fluids (0-2 hyaline casts/lpf)",
    ),
    TestDef(
        "urine_urobilinogen",
        "Urine urobilinogen",
        "mg/dL",
        (
            "urobilinogen",
            "urine urobilinogen",
            "urobilinogen urine",
            "urinary urobilinogen",
            "urobilinogen random urine",
        ),
        {"mg/dl": 1, "mg%": 1, "eu/dl": 1, "e.u./dl": 1},
        loinc="20405-7",
        typical=(TypicalRange("any", None, 1),),
        typical_source=(
            "Strasinger & Di Lorenzo, Urinalysis and Body Fluids (normal urine urobilinogen up to 1 mg/dL or "
            "1 Ehrlich unit; the Ehrlich unit is defined as equivalent to 1 mg/dL)"
        ),
    ),
    TestDef(
        "urine_bilirubin",
        "Urine bilirubin (bile pigments)",
        "mg/dL",
        (
            "urine bilirubin",
            "bilirubin urine",
            "urinary bilirubin",
            "bile pigments",
            "bile pigment",
            "urine bile pigments",
            "bile pigments urine",
            "urine bile pigment",
        ),
        {"mg/dl": 1, "mg%": 1, "umol/l": 1 / 17.1},
        loinc="20505-4",
    ),
    TestDef(
        "urine_bile_salts",
        "Bile salts (urine)",
        "",
        (
            "bile salts",
            "bile salt",
            "urine bile salts",
            "bile salts urine",
            "urine bile salt",
        ),
    ),
    TestDef(
        "urine_blood",
        "Blood (urine dipstick)",
        "ery/uL",
        (
            "urine blood",
            "blood urine",
            "blood in urine",
            "urine occult blood",
            "occult blood urine",
            "urine blood dipstick",
            "urine hemoglobin",
            "hemoglobin urine",
            "urine haemoglobin",
            "haemoglobin urine",
        ),
        {"ery/ul": 1, "rbc/ul": 1, "/ul": 1, "cells/ul": 1},
        loinc="20409-9",
    ),
    TestDef(
        "urine_leukocyte_esterase",
        "Leucocyte esterase (urine)",
        "leu/uL",
        (
            "leukocyte esterase",
            "leucocyte esterase",
            "urine leukocyte esterase",
            "urine leucocyte esterase",
            "leukocyte esterase urine",
            "leucocyte esterase urine",
        ),
        {"leu/ul": 1, "wbc/ul": 1, "/ul": 1, "cells/ul": 1},
        loinc="20408-1",
    ),
    TestDef(
        "urine_nitrite",
        "Nitrite (urine)",
        "",
        (
            "urine nitrite",
            "nitrite urine",
            "urine nitrites",
            "nitrites urine",
            "nitrite",
            "nitrites",
        ),
        {},
        loinc="5802-4",
    ),
    TestDef(
        "urine_colour",
        "Urine colour",
        "",
        (
            "urine colour",
            "urine color",
            "colour urine",
            "color urine",
            "colour of urine",
            "color of urine",
        ),
        {},
        loinc="5778-6",
    ),
    TestDef(
        "urine_appearance",
        "Urine appearance",
        "",
        (
            "urine appearance",
            "appearance urine",
            "appearance of urine",
            "urine clarity",
            "clarity urine",
            "urine transparency",
            "transparency urine",
            "urine turbidity",
            "turbidity urine",
        ),
        {},
        loinc="5767-9",
    ),
    TestDef(
        "urine_casts",
        "Casts (urine)",
        "/lpf",
        (
            "urine casts",
            "casts urine",
            "casts",
            "urinary casts",
        ),
        _PER_LPF,
        loinc="9842-6",
    ),
    TestDef(
        "urine_granular_casts",
        "Granular casts (urine)",
        "/lpf",
        (
            "granular casts",
            "granular cast",
            "urine granular casts",
            "granular casts urine",
        ),
        _PER_LPF,
        loinc="5793-5",
    ),
    TestDef(
        "urine_crystals",
        "Crystals (urine)",
        "/hpf",
        (
            "urine crystals",
            "crystals urine",
            "urinary crystals",
        ),
        {"/hpf": 1, "cells/hpf": 1, "per hpf": 1, "hpf": 1, "/h.p.f": 1, "/h.p.f.": 1},
    ),
    TestDef(
        "urine_calcium_oxalate_crystals",
        "Calcium oxalate crystals (urine)",
        "/hpf",
        (
            "calcium oxalate crystals",
            "ca oxalate crystals",
            "calcium oxalate crystal",
            "urine calcium oxalate crystals",
        ),
        {"/hpf": 1, "per hpf": 1, "hpf": 1, "/h.p.f": 1, "/h.p.f.": 1},
    ),
    TestDef(
        "urine_bacteria",
        "Bacteria (urine)",
        "/hpf",
        (
            "urine bacteria",
            "bacteria urine",
            "bacteria in urine",
        ),
        {"/hpf": 1, "cells/hpf": 1, "per hpf": 1, "hpf": 1, "/h.p.f": 1, "/h.p.f.": 1},
        loinc="5769-5",
    ),
    TestDef(
        "urine_yeast_cells",
        "Yeast cells (urine)",
        "/hpf",
        (
            "urine yeast cells",
            "yeast cells urine",
            "urine yeast",
            "yeast urine",
        ),
        {"/hpf": 1, "cells/hpf": 1, "per hpf": 1, "hpf": 1, "/h.p.f": 1, "/h.p.f.": 1},
        loinc="5822-2",
    ),
    TestDef(
        "urine_mucus",
        "Mucus threads (urine)",
        "",
        (
            "mucus threads",
            "mucous threads",
            "urine mucus",
            "mucus urine",
            "urine mucus threads",
            "mucus threads urine",
        ),
        {},
        loinc="8247-9",
    ),
    # Clotting
    TestDef(
        "prothrombin_time",
        "Prothrombin time (PT)",
        "sec",
        (
            "prothrombin time",
            "pt",
            "pt test",
            "prothrombin time pt",
            "pt patient",
            "patient pt",
            "prothrombin time patient",
            "pt patient value",
            "prothrombin time test",
        ),
        _SECONDS,
        loinc="5902-2",
        typical=(TypicalRange("any", 11, 13.5),),
        typical_source=(
            "MedlinePlus Medical Encyclopedia, Prothrombin time (11-13.5 seconds; reagent "
            "dependent, read with the lab's own control)"
        ),
    ),
    TestDef(
        "pt_control",
        "Prothrombin time control",
        "sec",
        (
            "pt control",
            "control pt",
            "prothrombin time control",
            "control prothrombin time",
            "pt control value",
            "control value pt",
            "prothrombin time control value",
            "mean normal prothrombin time",
            "mnpt",
        ),
        _SECONDS,
        loinc="5901-4",
    ),
    TestDef(
        "inr",
        "INR",
        "ratio",
        (
            "inr",
            "international normalised ratio",
            "international normalized ratio",
            "inr value",
            "pt inr value",
            "inr ratio",
        ),
        {"ratio": 1},
        loinc="6301-6",
        typical=(TypicalRange("any", 0.8, 1.1),),
        typical_source=(
            "MedlinePlus Medical Encyclopedia, Prothrombin time (INR 1.1 or below in people not on warfarin);"
            " therapeutic target on warfarin usually 2.0-3.0"
        ),
        recheck_months=0.5,
        recheck_source=(
            "ACCP/CHEST 2012 Antithrombotic Therapy guideline (Holbrook et al., Chest 2012;141:e152S): on "
            "warfarin with a single out-of-range INR, retest within 1-2 weeks"
        ),
    ),
    TestDef(
        "aptt",
        "aPTT",
        "sec",
        (
            "aptt",
            "a ptt",
            "aptt test",
            "aptt patient",
            "aptt patient value",
            "patient aptt",
            "activated partial thromboplastin time",
            "partial thromboplastin time",
            "activated ptt",
            "ptt",
            "ptt k",
            "aptt time",
        ),
        _SECONDS,
        loinc="14979-9",
        typical=(TypicalRange("any", 25, 35),),
        typical_source=(
            "MedlinePlus Medical Encyclopedia, Partial thromboplastin time (25-35 seconds; reagent dependent)"
        ),
    ),
    TestDef(
        "aptt_control",
        "aPTT control",
        "sec",
        (
            "aptt control",
            "control aptt",
            "aptt control value",
            "control value aptt",
            "ptt control",
            "control ptt",
            "activated partial thromboplastin time control",
        ),
        _SECONDS,
        loinc="13488-2",
    ),
    TestDef(
        "thrombin_time",
        "Thrombin time",
        "sec",
        (
            "thrombin time",
            "thrombin time tt",
            "thrombin clotting time",
            "tt thrombin time",
        ),
        _SECONDS,
        loinc="3243-3",
    ),
    TestDef(
        "fibrinogen",
        "Fibrinogen",
        "mg/dL",
        ("fibrinogen", "plasma fibrinogen", "serum fibrinogen", "fibrinogen level", "fibrinogen clauss"),
        {"mg/dl": 1, "mg%": 1, "g/l": 100, "gm/l": 100},
        loinc="3255-7",
        typical=(TypicalRange("any", 200, 400),),
        typical_source="MedlinePlus Medical Encyclopedia, Fibrinogen blood test (200-400 mg/dL)",
    ),
    TestDef(
        "bleeding_time",
        "Bleeding time",
        "min",
        ("bleeding time", "bt", "bleeding time bt"),
        _MINUTES,
        loinc="11067-6",
    ),
    TestDef(
        "clotting_time",
        "Clotting time",
        "min",
        (
            "clotting time",
            "coagulation time",
            "whole blood clotting time",
            "clotting time ct",
            "lee white clotting time",
        ),
        _MINUTES,
    ),
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


def typical_range(test: TestDef, sex: str | None) -> TypicalRange | None:
    """The typical adult range for this person's sex, else one for anyone, else None.

    With the sex unknown (or "other"), a male or female range is never used: picking
    the wrong one could call a normal value high or low.
    """
    sex = (sex or "").strip().lower()
    for wanted in (sex, "any") if sex in ("male", "female") else ("any",):
        for typical in test.typical:
            if typical.sex == wanted:
                return typical
    return None


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
