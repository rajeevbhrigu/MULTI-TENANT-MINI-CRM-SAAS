# Security

## Tenant isolation (the critical requirement)

**Tenant resolution never trusts the client.** The active tenant for a request is read from
`Session.activeTenantId` (a server-side DB row tied to an httpOnly session cookie), validated
against an `ACTIVE` `TenantUser` membership, on every single request — see
`src/server/tenant.ts::getTenantContext`. Nothing in a URL, query string, request body, or header
is ever used to pick which tenant's data to read or write.

Enforcement is layered:

1. **Application-level filtering.** Every query against tenant-owned data includes an explicit
   `tenantId` in its `WHERE` clause, built from the resolved tenant context.
2. **PostgreSQL Row Level Security**, as a backstop for (1). `withTenantContext(tenantId, fn)`
   (`src/server/db/tenant-context.ts`) opens a transaction, runs
   `SET LOCAL app.tenant_id = '<tenantId>'` (a session variable scoped to that transaction only —
   never leaks across requests sharing a pooled connection), and every tenant-owned table has a
   policy requiring `tenantId = current_setting('app.tenant_id')`. `FORCE ROW LEVEL SECURITY` is
   set so the policy applies even to the table-owning role, not just non-owner roles.

### Why some tables are *not* RLS-protected

Two categories of table rely on application-level scoping only, documented in the migrations
themselves (`prisma/migrations/20260920140000_relax_rls_identity_tables`,
`..._140500_relax_rls_operational_tables`):

- **Identity/bootstrap tables** — `TenantUser`, `Invitation`, `ApiKey`, `IntegrationConnection`.
  These are inherently queried *before* a tenant is known: resolving which workspace a logged-in
  user belongs to, accepting an invitation by its token, authenticating an API key, matching an
  inbound webhook's external account id to a tenant. RLS forced on these tables would block those
  exact lookups (`current_setting('app.tenant_id')` is necessarily unset at that point). Every
  query against them is instead filtered by a cryptographically strong secondary key — the
  authenticated session's `userId`, a SHA-256 token/key hash, or a unique external account id —
  never a client-supplied tenant id.
- **Operational/log tables** — `AuditLog`, `WebhookEvent`, `AutomationRule`, `AutomationRun`,
  `AiRequestLog`, `Notification`, `UsageRecord`. Written by trusted server code whose `tenantId`
  always comes from an already-authenticated context, frequently from background/post-transaction
  code paths (an audit entry recorded right after a tenant-scoped transaction commits; a webhook
  idempotency-ledger entry written before a tenant has even been resolved; a scheduled job
  scanning follow-ups across every tenant).

All real customer-facing business data — `Lead`, `Customer`, `Activity`, `Note`, `Followup`,
`Conversation`, `Message`, `Campaign`, `Pipeline*`, `Tag`, `CustomFieldDefinition`, `Attachment`,
`Deal`, `Contact`, `LeadStatusHistory`, `LeadCounter`, `OutboundWebhook` — keeps full
`FORCE ROW LEVEL SECURITY`. See `tests/integration/tenant-isolation.test.ts` and
`tests/integration/api-key-isolation.test.ts` for the automated proof.

### Production hardening beyond this codebase

This app currently connects to Postgres as the same role that owns the tables (the migration
role). `FORCE ROW LEVEL SECURITY` makes that safe, but a defense-in-depth production deployment
should also create a dedicated, least-privilege application role (no `BYPASSRLS`, no `SUPERUSER`)
distinct from the migration/owner role, and connect the running app as that role.

## Authentication & sessions

- Passwords hashed with **bcrypt** (cost factor 12), never stored or logged in plaintext.
- Sessions are **server-side records** (`Session` table) keyed by a random 256-bit token; only a
  SHA-256 hash of the token is stored. The cookie is `httpOnly`, `secure` in production,
  `sameSite=lax`.
- **Deactivating a user immediately revokes their sessions** (`setMemberStatusAction` deletes all
  `Session` rows for that user).
- Password reset tokens and email verification tokens are single-use, hashed at rest, and expire
  (1 hour / 24 hours respectively).
- Login and password-reset requests are rate-limited per email address.

## RBAC

`src/server/permissions.ts` defines a data-driven role → permission matrix (`OWNER`, `ADMIN`,
`MANAGER`, `SALES_AGENT`, `VIEWER`). Every Server Action and API route calls
`requirePermission()` / `requireApiPermission()` server-side — **hiding a button in the UI is
never the enforcement mechanism.** `TenantUser.customPermissions` allows additive grants beyond a
role's base set, as a foundation for future fully-custom roles.

## Secrets

- Integration credentials (WhatsApp/Meta/Gmail access tokens) are encrypted at rest with
  **AES-256-GCM** (`src/lib/crypto.ts::encryptSecret`) before being written to
  `IntegrationConnection.encryptedCredentials`, and are never sent to the browser.
- API keys are shown in full exactly once at creation; only a SHA-256 hash is persisted.
- `.env` is git-ignored; `.env.example` documents every variable without values. No secret is
  committed to this repository.
- `SECRETS_ENCRYPTION_KEY` and `AUTH_SECRET` must be generated per-environment (commands in
  `.env.example`) and never reused between dev/staging/production.

## Input validation & injection

- All form/Server Action inputs are validated with `zod` schemas (`src/lib/validation/`).
- All database access goes through Prisma's parameterized queries — including the RLS session
  variable itself, set via a tagged-template `$executeRaw` call, which Prisma binds as a parameter
  rather than string-concatenating (see the injection-attempt test in
  `tests/integration/tenant-isolation.test.ts`).
- React's JSX auto-escaping is the primary XSS defense; no `dangerouslySetInnerHTML` is used on
  user-supplied content anywhere in the app.

## Webhooks

- Every inbound webhook verifies an HMAC-SHA256 signature (`X-Hub-Signature-256`, the Meta/
  WhatsApp convention) against the connected tenant's stored secret before touching any data.
- Idempotency is enforced at the database level via a unique `(provider, providerEventId)`
  constraint on `WebhookEvent` — a re-delivered webhook is a verified no-op, not a duplicate
  record. See `tests/integration/webhook-idempotency.test.ts`.
- A processing failure (e.g. the tenant's lead limit was hit) is recorded on
  `WebhookEvent.processingError` rather than silently dropped.

## Rate limiting

Applied to login, signup, password reset, contact form, the REST API (per API key), and inbound
webhooks. In-memory by default (fine for a single instance); `REDIS_URL` is reserved for a
distributed store in a multi-instance deployment — swap the implementation in
`src/server/rate-limit.ts` without changing any call site.

## Audit logging

Every sensitive action (login, logout, lead created/updated/deleted/status-changed, user invited,
role changed, integration connected/disconnected, export, settings changed, subscription changed,
support access) is recorded to an append-only `AuditLog` row with the actor, before/after values
(secrets redacted — see `src/server/audit.ts::redact`), IP, and user agent. Regular tenant users
have no UI path to edit or delete audit records.

## Platform admin / support access

Platform admin (`isPlatformAdmin` on `User`, checked server-side, never via a hidden route) is a
separate permission space from any tenant's own Owner/Admin role. Entering a tenant's workspace as
support requires an explicit action with a required reason (`startSupportSessionAction`), shows a
persistent `SUPPORT MODE` banner to everyone in that workspace for the duration, and is fully
logged (`SupportAccessSession` + `AuditLog`). There is no silent impersonation path.

## Checklist

- [x] Tenant isolation enforced in application code and PostgreSQL RLS
- [x] RBAC enforced server-side on every mutation
- [x] Passwords hashed (bcrypt), never logged
- [x] Sessions server-side, revocable, httpOnly/secure cookies
- [x] Secrets encrypted at rest, never sent to the browser
- [x] Webhook signature verification + idempotency
- [x] Rate limiting on auth, API, webhooks
- [x] Input validation (zod) on every form/action
- [x] Audit log, append-only, secrets redacted
- [x] Platform admin separated from tenant admin; support access is explicit and logged
- [x] `.env` never committed; `.env.example` documents required vars
- [ ] Dedicated least-privilege Postgres application role (see "Production hardening" above) —
      documented, not yet wired into the default local dev setup
- [ ] Outbound webhook dispatcher (data model exists; delivery worker not yet built)
- [ ] Formal penetration test / third-party security review
