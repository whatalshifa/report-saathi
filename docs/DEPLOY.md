# Deploying ReportSaathi

The app is three pieces, and each can live on a different platform:

| Piece | What it needs |
|---|---|
| Website (`frontend/`) | Any host that runs Next.js. Set `API_URL` to the API's address **at build time**. |
| API (`backend/`) | Runs the Docker image. Migrations run automatically on start. |
| Database | Postgres. |
| Files | An S3-compatible bucket (AWS S3, Railway buckets, Cloudflare R2), or a disk. |

The browser only ever talks to the website. The website forwards `/api/*` to the API, so the sign-in
cookie stays first-party and no CORS setup is needed.

## Settings for the API

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic key |
| `RS_ENV` | `production` (secure cookies; refuses to start without an encryption key) |
| `RS_DATABASE_URL` | `postgresql+psycopg://USER:PASSWORD@HOST/DB?sslmode=require` |
| `RS_MASTER_KEY` | 32 random bytes, base64: `python -c "import base64, secrets; print(base64.b64encode(secrets.token_bytes(32)).decode())"` |
| `RS_STORAGE` | `s3` |
| `RS_S3_BUCKET` | Bucket name |
| `RS_S3_ENDPOINT_URL` | The bucket's endpoint (leave empty on AWS) |
| `RS_S3_REGION` | The bucket's region (`auto` for R2) |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | The bucket's keys (not needed on AWS with an IAM role) |
| `RS_KMS_KEY_ID` | AWS only, instead of `RS_MASTER_KEY`: a KMS key id or alias |

**Back up `RS_MASTER_KEY`.** Every stored file is encrypted with it; losing it means losing the files.
Switching between `RS_MASTER_KEY` and KMS later makes earlier files unreadable, so pick one before real
users arrive.

The API answers `GET /api/health` only when the database answers; point the platform's health check at
it. Run one copy of the API: background jobs run inside it, and a restarted API re-reads any report it
was in the middle of (`RS_RECOVER_JOBS_ON_START`).

## Option A: Railway + Vercel + Neon

Free or hobby tiers, a live link in minutes.

1. **Neon**: create a project, copy the connection string, change `postgresql://` to
   `postgresql+psycopg://`.
2. **Railway**: new project → deploy from the GitHub repo → root directory `backend` (it finds the
   Dockerfile). Add a **Bucket** to the project and copy its S3 credentials. Set the variables above,
   then generate a public domain.
3. **Vercel**: import the repo → root directory `frontend` → add `API_URL=https://<railway domain>`
   → deploy.

Both Railway and Vercel need their GitHub app installed on the repository's account.

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
