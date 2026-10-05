# How ReportSaathi works

This guide walks through the app the way a report travels through it. If you can explain this page in
an interview, you can explain the whole project.

## The three parts

| Part | Tool | Its job |
|---|---|---|
| Website | Next.js (React + TypeScript), Tailwind CSS | What the user sees: the upload box and the results page |
| API | FastAPI (Python) | Receives files, stores them, runs the AI step, answers the website's questions |
| Database | SQLite on your laptop, Postgres in production | Remembers every report and every value read from it |

The website never talks to Claude or the database directly. It only calls the API. That keeps the API
key secret (it lives only on the server) and means the website could be swapped for a phone app later
without touching anything else.

## The journey of one report

### 1. Upload (`frontend/src/components/UploadCard.tsx`)

The user drops a file. The browser sends it to `POST /api/reports` as a normal form upload.

### 2. Check the file (`backend/app/services/uploads.py`)

We never trust the file name. A file called `report.pdf` could be anything, so we read its first few
bytes, its "magic number": every PDF starts with `%PDF-`, every PNG with `\x89PNG`, and so on. Anything
else is rejected with a clear message.

Claude accepts images up to 5 MB, and phone photos are often bigger, so large photos are resized
(longest side 2400 px) before we keep them. That is still sharp enough to read small print.

### 3. Save it and answer at once (`backend/app/api/reports.py`)

The file goes to storage and a row goes into the `reports` table with status `queued`. The API replies
straight away with the new report's id. It does **not** wait for the AI, because reading a report can
take 20 to 60 seconds and an HTTP request should not hang that long.

The actual reading is handed to a **background job**.

### 4. The background job (`backend/app/services/processing.py`)

The job sets the status to `processing`, then:

1. loads the file from storage,
2. asks Claude to read it (step 5),
3. flags each value (step 6),
4. saves everything and sets the status to `done`, or to `failed` with a friendly message.

Meanwhile the results page asks the API every 2 seconds, "is it done yet?" This is called
**polling**. When the status changes to `done`, the page shows the results.

Today the job runs inside the API process (FastAPI's `BackgroundTasks`). At deployment it moves to a
separate worker that takes jobs from an AWS SQS queue, so a burst of uploads can't slow the website
down. Because the job is one plain function, `process_report()`, moving it is a small change.

### 5. Reading the report with Claude (`backend/app/services/extraction.py`)

Claude can read PDFs and images directly, so there is no separate OCR step. We send:

- the file (PDFs as a `document` block, photos as an `image` block),
- a short system prompt explaining the job: copy every test exactly as printed, don't guess
  unreadable values, pick the reference range that fits this patient,
- a **schema**: the exact shape the answer must have (`ExtractedReport` and `ExtractedTest`).

That last part is called **structured outputs**. Claude's reply is guaranteed to be valid JSON in our
shape, and the Anthropic SDK turns it straight into Python objects. We never parse free text with
fragile string matching.

Two other details worth knowing:

- We **stream** the response. Long reports produce long answers, and streaming avoids timeouts.
- If Claude's safety checks decline a request (very unlikely for lab reports), `fallbacks="default"`
  lets the API retry on another model automatically. We still check for a refusal and show a message.

### 6. Flagging values (`backend/app/services/flagging.py`)

This is the most important design choice in the project:

> **The AI reads. Code decides.**

Claude transcribes the value (`11.2`) and the printed range (`13.0 - 17.0`). Then ordinary Python code
parses the range and compares the numbers. So "is this value high?" is never a guess by a model; it is
a rule we can test. Nearly 40 tests cover this file alone.

Lab reports print ranges in many styles, and the parser handles the common ones:

| Printed | Parsed as |
|---|---|
| `13.0 - 17.0`, `13–17 g/dL`, `0.4 to 4.0` | low 13, high 17 |
| `< 200`, `Up to 40` | no low, high 200 |
| `> 40`, `≥ 60` | low 40, no high |
| `1,50,000 - 4,50,000` (Indian commas) | low 150000, high 450000 |
| `Desirable: <200; Borderline: 200-239` | too complex: use Claude's reading of the normal tier |

Word results work too: `Positive` against an expected `Negative` is flagged **abnormal**.

### 7. Showing results (`frontend/src/components/ReportView.tsx`)

The page shows a summary, a "needs attention" list of out-of-range values first, then every value
grouped by panel. The small bar (`RangeBar.tsx`) draws the normal range as a green band and the
patient's value as a dot. Colours are never the only signal: every value also has a text label
(Low, High, Normal), which matters for colour-blind users.

## Phase 2: from one report to a health timeline

### 8. Recognising the same test across labs (`backend/app/services/catalog.py`)

Every lab writes things its own way. Lab A prints `Haemoglobin (Hb) 13.4 g/dL`, lab B prints
`HGB 128 g/L`, lab C prints `Hemoglobin 12.4 gm%`. To draw one chart we need to know these are the
same test, and put them in the same unit.

The catalog lists 51 common tests. Each has:

- a **key** (`hemoglobin`) and a display name,
- a **standard unit** (`g/dL`),
- **aliases**: every spelling we've seen (`hb`, `hgb`, `haemoglobin`, ...),
- **unit conversions**: what to multiply by to reach the standard unit (`g/L` × 0.1).

Matching is done by code first. We tidy the printed name (lowercase, drop punctuation, try the part
inside brackets and the part before a comma) and look it up in the aliases. Only if that finds nothing
do we use the key Claude suggested while reading the report, and only if that key exists in the
catalog. While reading, Claude can only pick from the catalog's keys or "other", because the
schema lists them as an **enum** (a fixed list of allowed values).

If a unit isn't in the catalog, the value is **not** converted and stays off the chart. Guessing a
conversion for medical values would be worse than leaving a gap.

The converted numbers are saved next to the originals (`std_value`, `std_low`, `std_high` on each
test result), so the original report is never changed.

### 9. Grouping reports by person (`backend/app/services/people.py`)

For now, reports are grouped by the patient name printed on them: `Mr. Anil Sharma`, `ANIL SHARMA`
and `anil  sharma` all become the key `anil sharma`. It is simple on purpose. Phase 3 adds login and
proper family profiles, which will replace this.

### 10. Building the timeline (`backend/app/services/trends.py`)

`build_trends()` takes every finished report for a person, sorts them by date, and builds one
**series** per catalog test: a list of points, each with the date, the converted value, the flag
(judged against the range printed by *that* lab), and what the lab actually printed. It also works
out the change since the previous reading. Tests that are out of range at the latest reading are
listed first.

None of this uses AI. Every number on the timeline page and in the doctor brief's table comes from
here.

### 11. The trend chart (`frontend/src/components/TrendChart.tsx`)

A hand-drawn SVG chart, no chart library:

- the green band is the normal range, the dots are readings, and each dot's colour matches its
  Low/High/Normal label (colour is never the only signal),
- hovering (or tabbing with the keyboard) shows the date, the converted value, and what the lab
  printed,
- "Show as table" gives the same data as a table, for screen readers and for checking,
- the chart measures its real width, so text stays readable on phones.

### 12. Explanations in three languages (`backend/app/services/writing.py`)

The report page has a "What does this mean?" panel with English, हिन्दी and मराठी tabs. Asking for an
explanation starts a background job, the same pattern as reading a report: the API answers at once,
the page polls, and the result is saved so the same explanation is never paid for twice.

Claude receives the values **and the flags our code already decided**, and the prompt says:

- write for someone who studied up to class 8, in everyday Hindi or Marathi (Devanagari script),
- never change a flag, never invent values, never diagnose ("can be linked to", not "you have"),
- never name medicines or doses,
- set `see_doctor_soon` for values far outside the range, and say why.

The answer comes back in a fixed shape (`ReportExplanation`): a summary, one card per flagged value,
a line about the normal ones, and questions for the doctor.

### 13. The doctor brief (`backend/app/services/jobs.py`, `frontend/src/components/BriefView.tsx`)

"Prepare doctor brief" builds the person's timeline, sends it to Claude, and asks for a short clinical
overview, key findings and the patient's questions, in English for the doctor. The brief saves a
**snapshot** of the timeline numbers it was written from, so the printed table always matches the
text, even if more reports are added later. The page has print styles, so "Print or save as PDF"
gives a clean one-page handout.

### The rule that ties it together

> **The AI reads and writes words. Code does every number and every flag.**

Claude transcribes reports and writes explanations. Matching tests, converting units, comparing
against ranges, and computing changes are all plain Python with tests.

## The database

Four tables, defined in `backend/app/models.py`:

- `reports`: one row per uploaded file (status, lab name, patient name, date, person key).
- `test_results`: one row per value, linked to its report, with the catalog key and the value in the
  standard unit. Deleting a report deletes its values.
- `explanations`: one per report per language. Deleting a report deletes these too.
- `briefs`: one per doctor brief, with the snapshot of numbers it was written from.

Changes to tables are made with **Alembic migrations** (`backend/alembic/versions/`), never by hand,
so every copy of the database, on a laptop or on AWS, ends up identical.

## How we know it works

- `tests/test_flagging.py`: range parsing and flagging, case by case.
- `tests/test_api.py`: upload a file, wait for the job, check every flag; bad files; deletes.
- `tests/test_extraction.py`: checks the exact request we send to Claude, and how refusals and
  cut-off answers become friendly errors. Uses a fake client, so no API cost.
- `tests/test_catalog.py`: test-name matching, unit conversions, and grouping by name.
- `tests/test_trends.py`: three reports from three labs with three spellings and units become one
  timeline; explanations are made once per language and can be retried; the brief keeps its numbers.
- GitHub Actions runs all of it, plus lint and the website build, on every push.

## Where this goes on AWS

| Today | On AWS |
|---|---|
| `npm run dev` | AWS Amplify hosts the website |
| `uvicorn` | App Runner runs the API's Docker image |
| `BackgroundTasks` | SQS queue + a worker |
| `uploads/` folder | S3 bucket |
| SQLite | RDS Postgres |

Each row is a swap behind an existing boundary (`Storage`, `process_report`, `RS_DATABASE_URL`), which
is why the code is split the way it is.
