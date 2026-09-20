# Production Launch Checklist

## Verified in this build

- [x] Company can register (`/signup` creates user + tenant + Owner membership + trial subscription + default pipeline in one transaction)
- [x] Workspace is created with a default pipeline and statuses
- [x] Owner can log in
- [x] Email verification flow exists (`/api/auth/verify-email`)
- [x] Users can be invited, accept via a token link, and choose/keep a password
- [x] Roles (Owner/Admin/Manager/Sales Agent/Viewer) are enforced server-side
- [x] Tenant isolation verified automatically (`tests/integration/tenant-isolation.test.ts`,
      `tests/integration/api-key-isolation.test.ts`) and manually (cross-tenant API calls return
      404/empty, never another tenant's data)
- [x] Leads can be created, searched, filtered, sorted, assigned, bulk-updated
- [x] Status changes create immutable history rows
- [x] Activities, notes, follow-ups work and are tenant/lead scoped
- [x] Pipeline (Kanban) drag-and-drop updates stage + status + history together
- [x] Customer conversion preserves the original lead and its full history
- [x] Dashboard is tenant-specific (verified: a fresh tenant shows all-zero KPIs)
- [x] CSV import (mapping + preview + duplicate detection + result summary) and export work
- [x] Audit log records sensitive actions and is read-only for tenant users
- [x] Subscription/plan/usage-limit architecture works; limits enforced server-side, not just hidden UI
- [x] Platform admin console works, separated from tenant admin permissions
- [x] Integration framework works end-to-end in mock mode (connect → simulate inbound → lead/
      conversation/message created → visible in Inbox), verified via Playwright walkthrough
- [x] Webhooks are signature-verified and idempotent (automated tests)
- [x] APIs are tenant-aware (session or API key; both resolve tenant server-side only)
- [x] Mobile-responsive layouts (cards instead of tables below `lg` breakpoint; mobile nav drawer)
- [x] `pnpm build` and `pnpm test` both pass cleanly

## Before a real production launch

- [ ] Connect real credentials for at least one channel (WhatsApp/Meta/Instagram/Gmail) and flip
      that connection out of mock mode; verify a real inbound message end-to-end
- [ ] Wire a real payment provider (Stripe or Razorpay) behind `PaymentProvider` and test a real
      charge in that provider's sandbox
- [ ] Choose and configure a transactional email provider (`EMAIL_PROVIDER=resend` or similar) —
      the default `console` provider only logs emails, it does not send them
- [ ] Set up object storage for file attachments
- [ ] Create a dedicated least-privilege Postgres role for the running app (see `SECURITY.md`)
- [ ] Point `REDIS_URL` at a real Redis instance if running more than one app instance (the
      in-memory rate limiter is per-process)
- [ ] Schedule the follow-up reminders job (cron / Vercel Cron / GitHub Actions)
- [ ] Configure managed database backups with point-in-time recovery and test a restore
- [ ] Load test the leads list/dashboard queries at your expected data volume; add composite
      indexes beyond the defaults in `prisma/schema.prisma` if query plans show it's warranted
- [ ] Run a security review / basic penetration test, particularly around file upload handling
      once object storage is wired up
- [ ] Legal review of the placeholder Terms of Service and Privacy Policy content
- [ ] Set real `NODE_ENV=production`, confirm cookies are `secure`, confirm `.env` is not shipped
      in any build artifact
