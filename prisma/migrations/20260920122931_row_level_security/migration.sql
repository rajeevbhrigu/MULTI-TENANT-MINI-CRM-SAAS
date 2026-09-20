-- Row Level Security (defense-in-depth alongside application-level tenant
-- scoping in src/server/db/tenant-context.ts).
--
-- Every tenant-owned table gets a policy that only allows rows whose
-- "tenantId" matches the Postgres session variable `app.tenant_id`, which the
-- application sets with `SET LOCAL` at the start of every tenant-scoped
-- transaction (see withTenantContext()). Platform-admin / background-job
-- code paths that legitimately need cross-tenant access set
-- `app.is_platform_admin = 'true'` for that transaction instead of leaving
-- tenant_id unset - the client can never influence either setting.
--
-- FORCE ROW LEVEL SECURITY is applied so the policy is enforced even for the
-- table owner. In production, connect as a dedicated least-privilege role
-- (not the migration/owner role) for the same reason - see SECURITY.md.

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'TenantUser', 'Invitation', 'UsageRecord',
    'Lead', 'LeadCounter', 'LeadStatusHistory', 'Contact', 'Tag',
    'CustomFieldDefinition', 'Activity', 'Note', 'Followup',
    'Pipeline', 'PipelineStage', 'LeadPipelineStage',
    'Customer', 'Deal', 'Campaign', 'CampaignSource',
    'Conversation', 'Message', 'Attachment',
    'IntegrationConnection', 'OutboundWebhook',
    'Notification', 'SupportAccessSession', 'ApiKey',
    'AutomationRule', 'AutomationRun', 'AiRequestLog'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING ("tenantId" = current_setting(''app.tenant_id'', true) OR current_setting(''app.is_platform_admin'', true) = ''true'')
         WITH CHECK ("tenantId" = current_setting(''app.tenant_id'', true) OR current_setting(''app.is_platform_admin'', true) = ''true'');',
      t
    );
  END LOOP;
END $$;

-- Tables with an optional tenantId (rows may be tenant-unresolved, e.g. an
-- inbound webhook event not yet matched to a tenant, or a platform-level
-- audit log entry). These are only visible to the platform-admin context or
-- once the row's tenantId matches the session tenant.
ALTER TABLE "WebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "WebhookEvent"
  USING ("tenantId" IS NULL OR "tenantId" = current_setting('app.tenant_id', true) OR current_setting('app.is_platform_admin', true) = 'true')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR "tenantId" = current_setting('app.tenant_id', true) OR "tenantId" IS NULL);

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AuditLog"
  USING ("tenantId" IS NULL OR "tenantId" = current_setting('app.tenant_id', true) OR current_setting('app.is_platform_admin', true) = 'true')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'true' OR "tenantId" = current_setting('app.tenant_id', true) OR "tenantId" IS NULL);

-- OutboundWebhookDelivery is scoped indirectly through its parent
-- OutboundWebhook (no tenantId column of its own); rely on application-level
-- scoping plus the FK relationship for that table.
