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

## The database

Two tables, defined in `backend/app/models.py`:

- `reports`: one row per uploaded file (status, lab name, patient name, date).
- `test_results`: one row per value, linked to its report. Deleting a report deletes its values.

Changes to tables are made with **Alembic migrations** (`backend/alembic/versions/`), never by hand,
so every copy of the database, on a laptop or on AWS, ends up identical.

## How we know it works

- `tests/test_flagging.py`: range parsing and flagging, case by case.
- `tests/test_api.py`: upload a file, wait for the job, check every flag; bad files; deletes.
- `tests/test_extraction.py`: checks the exact request we send to Claude, and how refusals and
  cut-off answers become friendly errors. Uses a fake client, so no API cost.
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
