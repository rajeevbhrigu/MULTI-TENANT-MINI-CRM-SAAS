import type { TenantRole } from "@prisma/client";

export const PERMISSIONS = [
  "leads.view",
  "leads.create",
  "leads.edit",
  "leads.delete",
  "leads.assign",
  "leads.export",
  "leads.import",
  "activities.view",
  "activities.create",
  "customers.view",
  "customers.create",
  "customers.edit",
  "pipeline.view",
  "pipeline.manage",
  "campaigns.view",
  "campaigns.manage",
  "reports.view",
  "users.view",
  "users.invite",
  "users.edit",
  "settings.view",
  "settings.edit",
  "billing.view",
  "billing.manage",
  "integrations.view",
  "integrations.manage",
  "audit.view",
  "api_keys.manage",
  "automation.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// Role -> permission grants. Kept data-driven (not hard-coded switch
// statements scattered through the app) so custom roles can later be
// layered on top via TenantUser.customPermissions.
const ROLE_PERMISSIONS: Record<TenantRole, Permission[]> = {
  OWNER: [...PERMISSIONS],
  ADMIN: [
    "leads.view", "leads.create", "leads.edit", "leads.delete", "leads.assign", "leads.export", "leads.import",
    "activities.view", "activities.create",
    "customers.view", "customers.create", "customers.edit",
    "pipeline.view", "pipeline.manage",
    "campaigns.view", "campaigns.manage",
    "reports.view",
    "users.view", "users.invite", "users.edit",
    "settings.view", "settings.edit",
    "integrations.view", "integrations.manage",
    "audit.view",
    "api_keys.manage",
    "automation.manage",
  ],
  MANAGER: [
    "leads.view", "leads.create", "leads.edit", "leads.assign", "leads.export", "leads.import",
    "activities.view", "activities.create",
    "customers.view", "customers.create", "customers.edit",
    "pipeline.view", "pipeline.manage",
    "campaigns.view",
    "reports.view",
    "users.view",
    "settings.view",
  ],
  SALES_AGENT: [
    "leads.view", "leads.create", "leads.edit",
    "activities.view", "activities.create",
    "customers.view", "customers.create",
    "pipeline.view",
    "campaigns.view",
    "settings.view",
  ],
  VIEWER: [
    "leads.view",
    "activities.view",
    "customers.view",
    "pipeline.view",
    "campaigns.view",
    "reports.view",
    "settings.view",
  ],
};

export function getPermissionsForRole(role: TenantRole, customPermissions?: unknown): Permission[] {
  const base = new Set(ROLE_PERMISSIONS[role]);
  if (Array.isArray(customPermissions)) {
    for (const p of customPermissions) {
      if (typeof p === "string" && (PERMISSIONS as readonly string[]).includes(p)) {
        base.add(p as Permission);
      }
    }
  }
  return [...base];
}

export function hasPermission(
  role: TenantRole,
  permission: Permission,
  customPermissions?: unknown,
): boolean {
  return getPermissionsForRole(role, customPermissions).includes(permission);
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}
