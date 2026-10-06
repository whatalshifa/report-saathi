# Deploying ReportSaathi

The app is three pieces, and each can live on a different platform:

| Piece | What it needs |
|---|---|
| Website (`frontend/`) | Any host that runs Next.js. Set `API_URL` to the API's address **at build time**. |
| API (`backend/`) | Runs the Docker image. Migrations run automatically on start. |
| Database | Postgres. |
| Files | An S3-compatible bucket (AWS S3, Neon Object Storage, Cloudflare R2), or a disk. |

The browser only ever talks to the website. The website forwards `/api/*` to the API, so the sign-in
cookie stays first-party and no CORS setup is needed.

## Settings for the API

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic key. Optional: without it the site runs in demo mode (sample reports only, uploads paused) |
| `RS_ENV` | `production` (secure cookies; refuses to start without an encryption key) |
| `RS_DATABASE_URL` | `postgresql://USER:PASSWORD@HOST/DB?sslmode=require` (pasted as given; the app picks the psycopg driver itself) |
| `RS_MASTER_KEY` | 32 random bytes, base64: `python -c "import base64, secrets; print(base64.b64encode(secrets.token_bytes(32)).decode())"` |
| `RS_STORAGE` | `s3` |
| `RS_S3_BUCKET` | Bucket name |
| `RS_S3_ENDPOINT_URL` | The bucket's endpoint (leave empty on AWS) |
| `RS_S3_REGION` | The bucket's region (`auto` for R2) |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | The bucket's keys (not needed on AWS with an IAM role) |
| `RS_KMS_KEY_ID` | AWS only, instead of `RS_MASTER_KEY`: a KMS key id or alias |
| `RS_SENTRY_DSN` | Optional. A Sentry project's DSN to have crashes reported (sentry.io has a free plan) |
| `RS_GUEST_HOURS`, `RS_GUEST_UPLOAD_LIMIT`, `RS_DAILY_UPLOAD_LIMIT` | Optional. Demo accounts last 24 hours and can read 3 reports; every account can have 30 read a day |

**Back up `RS_MASTER_KEY`.** Every stored file is encrypted with it; losing it means losing the files.
Switching between `RS_MASTER_KEY` and KMS later makes earlier files unreadable, so pick one before real
users arrive.

The website takes `API_URL` (the API's address) and, optionally, `SITE_URL` (its own public address,
used in share previews and the sitemap) at build time.

`.github/workflows/keep-warm.yml` pings the API every 10 minutes so Render's free plan rarely puts it to
sleep. Set the repository variable `API_HEALTH_URL` if the API lives at a different address.

The API answers `GET /api/health` only when the database answers; point the platform's health check at
it. Run one copy of the API: background jobs run inside it, and a restarted API re-reads any report it
was in the middle of (`RS_RECOVER_JOBS_ON_START`).

## Option A: Render + Vercel + Neon (free)

Everything here is on a free tier. The catch: Render's free API sleeps after 15 idle minutes, so the
first request after a quiet spell takes about a minute while it wakes.

1. **Neon** (database and files): create a project. Copy the connection string from **Connect**.
   On the same branch, open **Storage**, create a private bucket named `reports`, then under
   **Connect → Storage → Parameters only** copy the endpoint, access key id and secret.
2. **Render** (API): **New → Blueprint** → pick the repo. Render reads [`render.yaml`](../render.yaml),
   generates `RS_MASTER_KEY`, and asks for the four values it can't know: `RS_DATABASE_URL`,
   `RS_S3_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. Add `ANTHROPIC_API_KEY` in the
   Environment tab whenever you want real uploads read.
   Afterwards, copy `RS_MASTER_KEY` from the service's Environment tab to a password manager.
3. **Vercel** (website): import the repo → root directory `frontend` → add
   `API_URL=https://<your service>.onrender.com` → deploy.

Render and Vercel each need their GitHub app allowed on the repository.

Railway works the same way as Render (root directory `backend`, the variables above, a Railway
bucket for files), but needs its paid Hobby plan once the trial ends.

## Option B: AWS

| Piece | AWS service |
|---|---|
| Website | Amplify Hosting (supports Next.js server features), `API_URL` as a build variable |
| API | App Runner, from the backend image pushed to ECR |
| Database | RDS Postgres (`db.t4g.micro` is in the free tier for 12 months) |
| Files | S3 bucket with public access blocked |
| Encryption key | KMS key, set as `RS_KMS_KEY_ID` |
| Secrets | `ANTHROPIC_API_KEY` and the database password in Secrets Manager, passed to App Runner |

App Runner's instance role needs only `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on the bucket
and `kms:Encrypt`, `kms:Decrypt` on the key. RDS should allow connections only from App Runner's VPC
connector.

Moving report reading from the API process to an SQS queue with a separate worker is the next step on
AWS: `process_report` already takes everything it needs as arguments, so the worker just calls it for
each message.

## After deploying

1. Open the website, create an account, add a family member, upload a sample report.
2. Check that the report is read and the file in the bucket starts with `RSE1` (encrypted).
3. Sign out and open a report link: it should ask you to sign in.
