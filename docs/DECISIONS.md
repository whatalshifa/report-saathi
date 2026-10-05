# Why each technology was picked

Short reasons, so they're easy to say in an interview.

**FastAPI (Python) for the API.** Python is where AI tooling lives. FastAPI checks every request
against typed models and writes interactive API docs automatically (`/docs`).

**Claude (`claude-opus-5-5`) to read reports.** It reads PDFs and photos directly, so there's no
separate OCR step to build and maintain, and structured outputs guarantee the reply matches our schema.
Effort is set to `medium` and can be changed with `RS_CLAUDE_EFFORT`.

**Plain Python for flagging, not the AI.** Deciding "high or normal" must be exact and testable. A
model is good at reading messy layouts; code is good at comparing numbers. Each does what it's best at.

**Background job + polling instead of waiting.** Reading takes tens of seconds. Returning at once
keeps the API responsive and maps directly onto a queue (SQS) in production.

**SQLAlchemy + Alembic.** The same code runs on SQLite locally and Postgres in production, and
migrations keep the schema versioned like the code.

**Checking files by their bytes.** File names and browser labels can lie. The first bytes can't.

**Next.js + TypeScript + Tailwind for the website.** A widely used stack for production web apps,
typed end to end, and it deploys cleanly to Amplify or Vercel.

**Storage behind a small interface.** `LocalStorage` today, `S3Storage` at deployment; nothing else in
the app changes.

## Phase 2

**A hand-written test catalog instead of letting the AI match tests.** Matching "HGB" to "Haemoglobin"
and converting g/L to g/dL has to be right every time. A list of aliases and conversion factors is
predictable and testable; Claude's suggestion is only a fallback, limited to the catalog's keys.

**Not converting unknown units.** A value with a unit we don't recognise stays off the chart rather
than being guessed at.

**A hand-drawn SVG chart instead of a chart library.** The chart is small and specific (a range band,
coloured points, a tooltip). Writing it directly keeps the bundle small and shows how charts work.

**Saving explanations and brief snapshots.** Each explanation is written once per language and
reused, which saves money. Each brief keeps the numbers it was written from, so its text and table
can never disagree.

**Grouping by printed name for now.** It's the simplest thing that works for one family. Login and
proper family profiles come in Phase 3.
