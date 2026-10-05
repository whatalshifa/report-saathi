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

## Phase 3

**Our own sign-in instead of a login service (Cognito, Clerk, Auth0).** Those are good choices for a
company. Building it here shows the pieces that matter: Argon2id hashing, random session tokens in
HttpOnly cookies, storing only token hashes, lockout after repeated failures. The code is short and
fully tested. Moving to Cognito later would only change `services/auth.py`.

**Server-side sessions instead of JWTs.** A JWT can't be cancelled before it expires, so signing out
or deleting an account wouldn't take effect everywhere. A session row can be deleted at once.

**The website forwards `/api/*` to FastAPI.** The browser talks to one address, so the sign-in cookie
is first-party, `SameSite=Lax` works, and there's no cross-site cookie setup to get wrong.

**Envelope encryption for files, with a key per file.** The same design as AWS KMS, so moving the
master key into KMS is a swap of one class. AES-GCM was chosen because it also detects tampering.

**Not encrypting database columns in the app.** Encrypting names and values in the app would stop the
database from sorting and grouping them for timelines. RDS encrypts the whole database at rest, and
the most sensitive item, the original report image, is encrypted by the app.

**"Not found" for other people's data.** Answering 403 would confirm the id exists. 404 reveals
nothing.

**Profiles chosen at upload, printed names only for a warning.** Matching by printed name broke on
real families (shared surnames, initials, "Baby of Priya"). The person uploading knows whose report
it is; the app only double-checks.

**Accuracy measured on real reports, published as totals only.** The answer keys are drafted by one
Claude reading to save typing, then corrected by hand against the paper. Scoring always uses a fresh
reading, so the test measures the app, not the draft. Reports stay out of git; only counts are
published.

## Deployment

**Render + Vercel + Neon for the live demo, AWS kept as the documented production route.** All three
have free tiers that need no card. Railway was the first pick, but its trial ended, and its Hobby plan
costs money. Render's free API sleeps when idle; for a portfolio demo a slow first visit is a fair
trade for zero cost.

**Neon for both the database and the files.** Neon Object Storage speaks the S3 API, so the existing
`S3Storage` works unchanged (it now uses path-style addresses for non-AWS endpoints). One provider,
one region (Singapore, close to users in India), and files are still encrypted by the app before
they leave the API.
