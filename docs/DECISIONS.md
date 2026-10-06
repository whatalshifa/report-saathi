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

**Show the source with a box from the reading itself, not OCR.** Claude already sees the page, so it
returns a box (page, and edges as fractions of the page) around each printed result in the same
structured reply. Fractions keep it independent of image size and zoom. Structured outputs can't
enforce number limits, so the server clamps edges to the page and drops a box with no area or no page;
a value with no box simply has no source button, because a wrong highlight is worse than none. Old
reports have no boxes and keep working.

**Draw the sample pages, and take the boxes from the drawing.** The demo has no AI key, so the sample
person's reports are drawn once by a script (Pillow, DejaVu Sans) as obviously made-up pages with a
"SAMPLE - made-up data" watermark, and the script writes each value's box into `meera.json` from where
it drew the value. The highlight is therefore exact, and the committed PNGs (about 50 KB each) mean the
server needs no font. They are stored encrypted per account like an upload, so viewing and deleting a
sample work the same way.

**Mark sample reports with a flag, not by their file type.** Upload limits and the corrections export
used to spot sample reports by their text placeholder. Now that samples are images, `reports.is_sample`
says so directly (migration 0007 sets it for existing text placeholders). A real report filed under the
sample person still counts against the limits.

**Serve the original from the API, privately.** `GET /api/reports/{id}/file` returns the decrypted file
to its owner only (404 for anyone else, as everywhere), inline, with `Cache-Control: private, no-store`
and `nosniff`. The page shows it in a native `<dialog>` (focus stays inside, Escape and a tap outside
close it, focus returns to the icon), with no new libraries. PDFs open in the browser's own viewer at
`#page=N` rather than being rendered in the page, which would need a PDF library.

**Share links are bearer tokens, stored like sessions.** A link to a brief carries a random 32-byte
token; the database keeps only its SHA-256 hash, so a leaked database opens nothing and the owner sees
the link only once (making another is one tap). Links last 7 days, and a demo account's links end when
the account is due to be deleted, so a link never outlives its data. Revoking sets `revoked_at` instead
of deleting the row, so "opened N times" survives; deleting the profile or account deletes the links
and their log with it (database cascades). The log keeps only the time of each opening, no address or
browser, because the owner only needs to know whether the doctor looked.

**One answer for every dead link.** Unknown, expired and revoked tokens all get the same 404 body and
headers, and opening is rate-limited per address, so tokens can't be probed or guessed. The public
response is `Cache-Control: no-store` and `Referrer-Policy: no-referrer` (the page sets no-referrer and
`noindex` too), since the address itself is the key. The shared brief leaves out the account's profile
and report ids. The page fetches the brief in the browser rather than on the Next server, so the rate
limit sees the doctor's address, and it reuses the same `BriefSheet` component as the owner's page
without the app's navigation. A QR code was left out: it would need a new library, and the phone's own
share sheet already sends the link to WhatsApp.

**Data rights are buttons, not emails.** India's DPDP Act 2023 gives access, correction, erasure and
grievance rights. Access is "Download all my data", correction is the fix-it pencil, erasure is the
existing delete buttons, and grievances go to a GitHub issue (the project has no support inbox, and an
invented address would be worse than none). The privacy page says how to use each one in the app.

**The export is one ZIP built on the server with the standard library.** `zipfile` writes into a
`SpooledTemporaryFile` (memory up to 16 MB, then disk), which is streamed back with its
`Content-Length`, so the page can show a real percentage. Original files are decrypted and stored
without recompression (PDFs and images are already compressed), named `reports/<person>/<date>.<ext>`
rather than by upload name. The JSON leaves out every secret (password hash, token hashes) and a demo
account's made-up email; the CSV has a byte-order mark so Excel shows Hindi and Marathi names, and
cells starting with `=`, `+`, `-` or `@` get a leading apostrophe so text read off a report can never
run as a spreadsheet formula. A file missing from storage is noted in the JSON instead of failing the
whole download. Decrypting everything is costly, so it is limited to 5 an hour per account.

**Consent is versioned, asked at the first upload, and checked by the server.** The notice's text has
a version (`CONSENT_VERSION`, the same in the dialog and the API); the user row keeps the version
agreed to and when (migration 0009). Uploads answer 428 until the current version is agreed, so a
changed notice asks everyone again, and the API refuses agreement to an out-of-date version. It is
asked when someone chooses a file, not at sign-up, so demo visitors and people trying the sample
person are never interrupted; the chosen file waits in the page and is sent only after "I agree".
The AI-off check comes first, since asking for consent to something that can't happen is pointless.

**A hand-written service worker that caches nothing.** Share-to needs a service worker to catch the
POST WhatsApp sends to `/share-target`, but a caching worker could serve one family's report pages or
API answers to the next person on a shared phone, or an old version after a fix. So `public/sw.js`
(no library) answers only that POST and lets every other request go to the network untouched. It
keeps the shared file in Cache Storage under one key (the `/share` page reads it from there), replaced
by the next share, and removed on upload, "Discard", sign-out, or after a day. The file is not
encrypted on the phone; it is the same file WhatsApp already keeps there. The worker registers only in
production builds over https or localhost. If a share arrives before the worker is running, a small
`/share-target` route redirects to a kind "please share it again" note instead of an error page.

**Signed-out shares go through sign-in, not around it.** `/share` stays a private page, so the proxy
sends a signed-out person to sign in with `next=/share`, and the file waits in Cache Storage until they
come back (the demo button on the sign-in page now honours `next` too). A shared report is never filed
under the made-up sample person; the picker lists real family members only.

**App icons are drawn at build time from the favicon's shapes.** `src/app/icons/[name]/route.tsx`
renders the 192 and 512 icons and a full-bleed maskable one with `next/og`, prerendered by
`generateStaticParams`, so there are no binary files to keep in step with `icon.svg`.

**Read aloud uses the browser's voices, and hides when there is none.** The Web Speech API is free and
works offline, but which voices exist depends on the device (many have no Marathi voice). The button
shows only when a voice for the language exists (exact `hi-IN` first, then any `hi`), re-checked when
the browser's voice list arrives (`voiceschanged`). Text is spoken sentence by sentence because some
browsers stop one long utterance part-way, and speech stops when the language changes or the page
closes. It reads the warning (if any), the summary, each flagged test and the questions, and skips
the long lists of common reasons to keep it listenable.
