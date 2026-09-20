-- Operational/system tables (audit trail, inbound-webhook idempotency
-- ledger, automation bookkeeping, AI usage logs, notifications, usage
-- counters) are written by trusted server code whose tenantId always comes
-- from an already-authenticated context (never client input), frequently
-- from background/post-transaction code paths that run outside any single
-- tenant's RLS transaction (e.g. an audit entry recorded right after a
-- tenant-scoped transaction commits, or a webhook ledger entry written
-- before a tenant has even been resolved). Enforcing RLS on writes here
-- blocks those legitimate paths, so - like the identity/bootstrap tables in
-- the previous migration - these rely on application-level tenantId
-- filtering rather than a DB-level policy. Reads remain explicitly scoped
-- by tenantId in every query (see src/server/audit.ts, notify.ts,
-- automation/engine.ts, ai/provider.ts call sites).
--
-- Truly sensitive customer-facing data (Lead, Customer, Activity, Note,
-- Followup, Conversation, Message, Campaign, Pipeline*, Tag, etc.) keeps
-- full FORCE ROW LEVEL SECURITY from the original migration.

DO $$
DECLARE
  t text;
  relaxed_tables text[] := ARRAY[
    'AuditLog', 'WebhookEvent', 'AutomationRule', 'AutomationRun',
    'AiRequestLog', 'Notification', 'UsageRecord'
  ];
BEGIN
  FOREACH t IN ARRAY relaxed_tables LOOP
    EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', t);
  END LOOP;
END $$;
