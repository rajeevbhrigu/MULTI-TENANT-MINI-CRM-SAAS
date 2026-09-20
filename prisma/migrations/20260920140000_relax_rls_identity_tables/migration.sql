-- Identity/bootstrap tables (TenantUser, Invitation, ApiKey,
-- IntegrationConnection) are queried BEFORE a tenant is known: resolving
-- which workspace a logged-in user belongs to, accepting an invite by
-- token, authenticating an API key, and matching an inbound webhook's
-- external account id to a tenant. Forced RLS on these tables would block
-- those exact lookups (current_setting('app.tenant_id') is necessarily
-- unset at that point), so they rely on application-level scoping instead:
-- every query against them is filtered by a strong secondary key (the
-- authenticated session's userId, a SHA-256 token/key hash, or a unique
-- external account id) rather than a client-supplied tenant id. Once the
-- tenant is resolved, all subsequent business-data queries go through
-- withTenantContext()/RLS as normal.

ALTER TABLE "TenantUser" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "TenantUser" DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "TenantUser";

ALTER TABLE "Invitation" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "Invitation" DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Invitation";

ALTER TABLE "ApiKey" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ApiKey";

ALTER TABLE "IntegrationConnection" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "IntegrationConnection" DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "IntegrationConnection";
