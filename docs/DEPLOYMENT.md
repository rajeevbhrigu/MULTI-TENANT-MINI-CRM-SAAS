# Deployment

## Environments

The app reads `NODE_ENV` and expects three environments to exist: `development`, `staging`,
`production`. Each should have its own PostgreSQL database and its own `.env` (never shared
secrets between environments).

## Environment variables

See [`.env.example`](../.env.example) for the full list with generation commands. Required to
boot the app at all:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_URL` | Public base URL (used in emails/links) |
| `AUTH_SECRET` | Session signing material — `openssl rand -base64 32` |
| `SECRETS_ENCRYPTION_KEY` | AES-256 key for integration credentials at rest — `openssl rand -hex 32` |

Everything else (WhatsApp/Meta/Gmail/payment/AI credentials, `REDIS_URL`,
`INTERNAL_JOB_TOKEN`) is optional — the app runs correctly in mock mode without any of it.

## Build & run

```bash
pnpm install --frozen-lockfile
pnpm db:migrate       # applies all migrations, including RLS policies - run this every deploy
pnpm build
pnpm start
```

`pnpm db:migrate` runs `prisma migrate dev` locally; for a non-interactive production deploy use
`prisma migrate deploy` instead (applies pending migrations without prompting or generating new
ones):

```bash
npx prisma migrate deploy
```

## Database

- PostgreSQL 14+ required (Row Level Security + `gen_random_uuid`-style features are broadly
  supported from 13+, but the migrations were developed and tested against 16).
- Run migrations as a role with permission to `ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY`
  and `CREATE POLICY` (typically the table owner or a superuser during deploy) — the day-to-day
  application connection can use a more restricted role afterward (see
  [`SECURITY.md`](SECURITY.md) → "Production hardening").
- Connection pooling: if you front Postgres with PgBouncer in transaction-pooling mode, note that
  `SET LOCAL` (used to set the RLS session variable) is transaction-scoped, which is compatible;
  avoid session-level `SET` alternatives.

## Backups

Not automated by this codebase — use your hosting provider's managed Postgres backups (point-in-
time recovery, daily snapshots with a retention policy of at least 7–30 days depending on plan).
Platform admins should be able to see backup health/status from the hosting provider's dashboard;
surfacing that status inside `/platform-admin` is a natural next addition once a specific provider
is chosen.

**Restore procedure** (generic):

1. Provision a new database from the desired snapshot/point-in-time.
2. Point a *staging* `DATABASE_URL` at it first and run the app's test suite (`pnpm test`) plus a
   manual smoke test.
3. Only then cut production traffic over, and rotate `AUTH_SECRET` if the incident involved
   credential exposure (this invalidates all sessions, which is desired after a restore).

## Background jobs

`pnpm dev`/`pnpm start` do not run a worker process. Two jobs need external scheduling:

- **Follow-up reminders** — `POST /api/internal/jobs/followup-reminders` with header
  `X-Internal-Job-Token: <INTERNAL_JOB_TOKEN>`. Idempotent; safe to run every 5–15 minutes via
  cron, Vercel Cron, or a GitHub Actions schedule.
- **Automation runs** are triggered inline from the relevant Server Action (`LEAD_CREATED`,
  `STATUS_CHANGED`) — no separate scheduler needed today, but a queue (`REDIS_URL` is reserved for
  this) is the natural next step if automation actions need to be retried/rate-limited
  independently of the request that triggered them.

## Object storage

`Attachment.storageKey` is designed for an S3-compatible bucket (`STORAGE_URL`,
`STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET` in `.env.example`); wire up your
provider's SDK behind a small storage adapter before enabling file uploads in production. Files
must never be served from a predictable public URL — always via a signed/expiring URL or an
authenticated proxy route.

## Platforms

The app is a standard Next.js application and deploys to any Node.js host (a Vercel-style
platform, a container on ECS/Cloud Run/Fly.io, or a plain VM behind a reverse proxy). No
platform-specific APIs are used outside of `next.config.ts`.
