# Architecture

## System overview

```
                                   ┌─────────────────────────┐
                                   │        Browser           │
                                   │  (tenant users, admins)  │
                                   └────────────┬─────────────┘
                                                │ HTTPS
                                   ┌────────────▼─────────────┐
                                   │   Next.js App Router      │
                                   │  ┌──────────────────────┐ │
                                   │  │ Marketing site (SSG)  │ │
                                   │  ├──────────────────────┤ │
                                   │  │ Auth pages             │ │
                                   │  ├──────────────────────┤ │
                                   │  │ Authenticated app       │ │
                                   │  │  (dashboard, leads,      │ │
                                   │  │   pipeline, customers…)  │ │
                                   │  ├──────────────────────┤ │
                                   │  │ Platform admin console  │ │
                                   │  ├──────────────────────┤ │
                                   │  │ REST API v1              │ │
                                   │  ├──────────────────────┤ │
                                   │  │ Inbound webhooks         │ │
                                   │  └──────────┬───────────┘ │
                                   └─────────────┼─────────────┘
                                                 │
                     ┌────────────────────────────┼─────────────────────────────┐
                     │                            │                             │
           ┌─────────▼─────────┐      ┌──────────▼──────────┐      ┌──────────▼──────────┐
           │  Server Actions /   │      │  Integration adapters │      │   Background jobs     │
           │  Query layer         │      │  (WhatsApp/Meta/IG/    │      │  (followup reminders, │
           │  src/server/actions   │      │   Gmail) - mock or     │      │   automation runner)   │
           │  src/server/queries    │      │   live per connection   │      │                         │
           └─────────┬─────────┘      └──────────┬──────────┘      └──────────┬──────────┘
                     │                            │                             │
                     │              ┌─────────────▼─────────────┐              │
                     └─────────────►│   Tenant context layer      │◄─────────────┘
                                    │  src/server/tenant.ts        │
                                    │  src/server/db/tenant-context │
                                    │  (resolves tenant from session,│
                                    │   sets RLS session vars)       │
                                    └─────────────┬─────────────┘
                                                 │
                                    ┌─────────────▼─────────────┐
                                    │        PostgreSQL           │
                                    │  ┌────────────────────┐   │
                                    │  │ Row Level Security   │   │
                                    │  │ policies on every     │   │
                                    │  │ tenant-owned table    │   │
                                    │  └────────────────────┘   │
                                    └─────────────────────────────┘
```

## Request lifecycle (tenant-scoped page)

1. Browser requests `/leads`. `src/app/(app)/layout.tsx` calls `requireTenantContext()`.
2. `requireTenantContext()` reads the session cookie, validates it against the `Session` table,
   resolves the active tenant from `Session.activeTenantId` (never from a URL/query param), and
   confirms an `ACTIVE` `TenantUser` membership exists for that user+tenant.
3. The page calls a query function (e.g. `listLeads(tenantId, filters)`), which runs inside
   `withTenantContext(tenantId, fn)`. That helper opens a Postgres transaction, sets
   `app.tenant_id` via `SET LOCAL` (a session variable scoped to that transaction only), and runs
   the query. Every `WHERE` clause still explicitly filters by `tenantId` — RLS is the backstop,
   not the only mechanism.
4. PostgreSQL evaluates the table's RLS policy (`tenantId = current_setting('app.tenant_id')`) on
   every row before returning it. Even a bug that forgot the `tenantId` filter in application code
   would still only see that tenant's rows.

## Multi-tenant data model

Every tenant-owned table carries a `tenantId` column. Tables fall into three tiers:

| Tier | Examples | RLS enforcement |
|---|---|---|
| **Core business data** | Lead, Customer, Activity, Note, Followup, Pipeline*, Campaign*, Conversation, Message, Attachment, Tag, CustomFieldDefinition | `FORCE ROW LEVEL SECURITY` — enforced even for the connecting role, on every read/write |
| **Identity/bootstrap** | TenantUser, Invitation, ApiKey, IntegrationConnection | Application-level filtering only (queried before a tenant is resolved — see SECURITY.md) |
| **Operational/log** | AuditLog, WebhookEvent, AutomationRule/Run, AiRequestLog, Notification, UsageRecord | Application-level filtering only (written by trusted server code, often post-transaction or from background jobs) |

See [`SECURITY.md`](SECURITY.md) for the full rationale.

## Module layout

- **`src/server/tenant.ts`** — the single source of truth for "who is logged in and which
  workspace are they in." Every authenticated page and Server Action starts with
  `requireTenantContext()`.
- **`src/server/permissions.ts`** — a data-driven role → permission matrix (`OWNER`, `ADMIN`,
  `MANAGER`, `SALES_AGENT`, `VIEWER`). `requirePermission(ctx, "leads.delete")` throws if the
  current role lacks it; API routes use the equivalent `requireApiPermission`.
- **`src/server/db/tenant-context.ts`** — `withTenantContext()` / `withPlatformAdminContext()`,
  the only two ways application code is meant to open a database transaction against tenant-owned
  tables.
- **`src/server/integrations/`** — one `ChannelAdapter` implementation per provider
  (WhatsApp/Facebook/Instagram/Gmail), a shared `webhook-handler.ts` pipeline (signature
  verification → idempotency → lead-intake), and `lead-intake.ts` (match-or-create lead,
  match-or-create conversation, append message + activity, notify).
- **`src/server/automation/engine.ts`** — loads `AutomationRule` rows for a tenant + trigger
  event, evaluates conditions, and executes actions (`assign_round_robin`, `create_followup`,
  `notify_manager`, `set_priority`). Reusable — not hard-coded per page.
- **`src/server/ai/provider.ts`** — one `AIProvider` interface; only a deterministic mock
  implementation is wired up. AI output is always tagged `isAiGenerated: true` and the UI never
  persists it as a note without an explicit human "Approve & save" action.
- **`src/server/billing/provider.ts`** — one `PaymentProvider` interface; only a mock
  implementation is wired up. Plan limits live in the `Plan` table, never in code.

## Why Next.js Server Actions instead of a separate API for the web app

The authenticated app's own UI talks to the server via React Server Actions
(`src/server/actions/*.ts`), which run the exact same tenant-context/RBAC/audit code paths as the
REST API. The versioned REST API (`/api/v1/*`) exists for external integrations (Zapier, custom
scripts, CI) and is authenticated separately via API keys — see [`API.md`](API.md).
