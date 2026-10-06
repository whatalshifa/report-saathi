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

**Demo mode instead of a paid key for the public site.** The Anthropic API has no free tier. Rather
than a broken upload box, the site says reading is paused and offers sample reports. Their values
are stored as a pre-made reading (the same shape Claude returns), so flags, units and trends still
come from the app's own code, not from the sample file. Clients to Claude are created on first use,
so the server boots without a key.

## Phase 4: production polish

**A one-click guest account instead of a shared demo login.** A shared login would let one visitor see
or delete what another added. Each "Try the demo" click makes its own account with the sample person
in it, signed in with a cookie that lasts 24 hours. Expired guests are deleted (with their files)
whenever a new demo starts and when the API starts, so no scheduler is needed.

**Limits that cap cost, not just abuse.** Guests can have 3 reports read and every account 30 a day.
With the AI switched on, that puts a ceiling on what one person can spend. Sign-in and demo creation
are rate limited per address in memory; with one API copy that is enough, and the limiter keeps the
same interface if it later moves to Redis.

**The server can be asleep; the site should say so.** Render's free API sleeps after 15 quiet minutes.
Reads that fail while it wakes are retried for about a minute, and the page shows "waking up the
server" after 2.5 seconds instead of looking frozen. Writes are never retried, so nothing is created
twice. A GitHub Action pings the API every 10 minutes, which keeps it awake within the free plan's
hours.

**Design tokens, not a component library.** Colours live as CSS variables with light and dark values,
and a handful of shared classes (`card`, `btn`, `input`) are used everywhere. That keeps the bundle
small and the look consistent without adding a dependency. Dark mode follows the device unless the
visitor picks one, and printing always uses the light theme.

**Charts keep the normal range in view.** Previously, when every reading was above the range (LDL),
the range band fell off the chart. The y-axis now always includes both ends of the range, and each
card says in words whether the latest reading moved towards or away from it.

## Phase 5

**A fix is re-flagged by code, and the first reading is kept.** When someone corrects a value, the app
parses, flags and converts it with exactly the code a fresh reading uses, against the range printed on
the report. The result keeps what the AI first read, so the page can say "it was read as 10.6", and
every fix goes into a `corrections` log. Putting the original value back removes the "Corrected" chip;
the log keeps both steps.

**Refuse fixes that would quietly break the timeline.** A word where the lab printed a number range,
or a unit the catalog can't convert for that test, is refused with a plain message instead of being
saved and silently dropping the value off the chart.

**Explanations are not rewritten after a fix.** Rewriting needs the AI, which the demo doesn't have,
and the sample explanations would be lost. Instead the explanation says it was written before a value
was corrected.

**Corrections feed the accuracy kit as test cases, without personal data.** The export keeps only the
test name, the value and unit read, and the value and unit corrected. It leaves out the sample
reports (typed by hand, so a change there is someone trying the button) and fixes the scoring treats
as no change ("2,50,000" to "250000"). It goes to the git-ignored `accuracy/data/` folder by default.
