# MiniCRM

A production-grade, multi-tenant SaaS CRM. Capture, organize, follow up and convert leads from
WhatsApp, Facebook, Instagram and Gmail — with real tenant isolation, RBAC, an audit trail, and a
provider-agnostic integration/billing/AI architecture.

This is a working application, not a static prototype: every page reads and writes a real
PostgreSQL database through Prisma, authentication is a real session system, and tenant isolation
is enforced twice — once in application code and again at the database layer with PostgreSQL Row
Level Security.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system architecture, diagrams, module layout
- [`docs/API.md`](docs/API.md) — REST API v1 endpoint reference + webhook payloads
- [`docs/ERD.md`](docs/ERD.md) — database entity-relationship diagram
- [`docs/SECURITY.md`](docs/SECURITY.md) — security checklist and threat model notes
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deployment, backups, environment variables
- [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md) — production launch checklist

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL + Prisma ORM, with Row Level Security |
| Auth | Custom session system (bcrypt + httpOnly cookies + DB-backed sessions) |
| Charts | Recharts |
| Tests | Vitest |
| Integrations | Provider-agnostic adapters (WhatsApp, Facebook, Instagram, Gmail) with a mock mode |
| Payments | Provider-agnostic (mock provider wired up; Stripe/Razorpay-ready interface) |
| AI | Provider-agnostic (mock provider wired up) |

## Getting started

### 1. Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL 14+ running locally (or a connection string to one)

### 2. Install and configure

```bash
pnpm install
cp .env.example .env
```

Edit `.env` and set at minimum:

- `DATABASE_URL` — your PostgreSQL connection string
- `AUTH_SECRET` — `openssl rand -base64 32`
- `SECRETS_ENCRYPTION_KEY` — `openssl rand -hex 32`

Everything else in `.env.example` is optional: real WhatsApp/Meta/Gmail/payment/AI credentials are
not required to run the app — every one of those integrations runs in a safe **mock mode** until
you connect real credentials from Settings → Integrations.

### 3. Set up the database

```bash
pnpm db:migrate   # applies prisma/migrations, including the RLS policies
pnpm db:seed      # optional: creates a demo workspace with sample data
```

The seed script prints a login you can use immediately:

```
owner@minicrm-demo.example / DemoPass123!
```

### 4. Run it

```bash
pnpm dev
```

Visit `http://localhost:3000`. The public marketing site is unauthenticated; `/signup` creates a
brand-new workspace (tenant) with its own isolated data, default pipeline, and a 14-day trial
subscription.

### 5. Run the tests

```bash
pnpm test
```

Covers RBAC permission logic, password/token/secret crypto, CSV export escaping, and — the
critical suite — tenant isolation (cross-tenant reads blocked by both app filters and PostgreSQL
RLS), API-key tenant scoping, and webhook signature verification + idempotency.

## Project structure

```
src/
  app/                    Next.js App Router routes
    (marketing)/          Public site: /, /features, /pricing, /security, /about, /contact, ...
    (auth)/                /login, /signup, /forgot-password, /reset-password
    (app)/                 Authenticated tenant app: dashboard, leads, pipeline, ...
    platform-admin/        Cross-tenant platform admin console
    api/v1/                Versioned REST API + inbound webhooks
  components/
    ui/                    Design-system primitives (Button, Card, Badge, Field)
    app/                   Authenticated-app components (sidebar, tables, charts, kanban)
    marketing/             Public site components
  server/
    db/                    Prisma client + tenant-scoped transaction helpers (RLS)
    auth/                  Password hashing, session management
    actions/               Server Actions (the app's primary write path)
    queries/                Read-side query builders (leads, dashboard, reports)
    integrations/           Channel adapters (WhatsApp/Meta/Instagram/Gmail) + webhook pipeline
    automation/             Event-driven automation engine
    ai/                     AI provider abstraction
    billing/                Payment provider abstraction
    permissions.ts          RBAC role → permission matrix
    tenant.ts                Tenant context resolution (the only source of truth for "which tenant")
  lib/                      Framework-agnostic helpers (crypto, csv, slug, format)
prisma/
  schema.prisma             Full data model
  migrations/                Including the RLS policy migrations
  seed.ts                    Demo data generator
tests/
  unit/                      Pure-function tests
  integration/                Database-backed tests (tenant isolation, webhooks, usage limits)
```

## Key design decisions

- **Tenant resolution never trusts the client.** The active tenant is read from the authenticated
  session server-side (`src/server/tenant.ts`); a `tenantId` in a request body/query is never used
  to select which tenant's data to read or write.
- **Two layers of tenant isolation.** Every Prisma query for tenant-owned data is explicitly
  filtered by `tenantId`, *and* runs inside `withTenantContext()`, which sets a PostgreSQL session
  variable that Row Level Security policies enforce as a backstop — see
  [`docs/SECURITY.md`](docs/SECURITY.md) for exactly which tables are RLS-protected and why a
  small set of identity/bootstrap and operational-log tables rely on application-level scoping
  instead (they are, by nature, queried before a tenant is known).
- **Integrations are adapters, not scattered API calls.** `src/server/integrations/*/adapter.ts`
  implements one `ChannelAdapter` interface per provider; core CRM code never imports a provider
  SDK directly, and every provider runs in a `MOCK` mode that exercises the full webhook →
  lead-intake → conversation pipeline without a single real API call.
- **Nothing is hard-coded that the spec asked to be configurable**: plan limits live in the `Plan`
  table, roles/permissions are data-driven (`src/server/permissions.ts`), pipelines/stages are
  tenant-editable rows, and the payment/AI/email providers are all swappable interfaces with only a
  mock implementation wired up today.
