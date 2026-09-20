import { describe, it, expect } from "vitest";
import { hasPermission, getPermissionsForRole } from "@/server/permissions";

describe("RBAC permissions", () => {
  it("OWNER has every permission", () => {
    expect(hasPermission("OWNER", "billing.manage")).toBe(true);
    expect(hasPermission("OWNER", "leads.delete")).toBe(true);
    expect(hasPermission("OWNER", "integrations.manage")).toBe(true);
  });

  it("VIEWER cannot create, edit, or delete leads", () => {
    expect(hasPermission("VIEWER", "leads.view")).toBe(true);
    expect(hasPermission("VIEWER", "leads.create")).toBe(false);
    expect(hasPermission("VIEWER", "leads.edit")).toBe(false);
    expect(hasPermission("VIEWER", "leads.delete")).toBe(false);
  });

  it("SALES_AGENT cannot manage billing, users, or integrations", () => {
    expect(hasPermission("SALES_AGENT", "billing.manage")).toBe(false);
    expect(hasPermission("SALES_AGENT", "users.invite")).toBe(false);
    expect(hasPermission("SALES_AGENT", "integrations.manage")).toBe(false);
    expect(hasPermission("SALES_AGENT", "leads.create")).toBe(true);
  });

  it("MANAGER can assign and export leads but not manage billing", () => {
    expect(hasPermission("MANAGER", "leads.assign")).toBe(true);
    expect(hasPermission("MANAGER", "leads.export")).toBe(true);
    expect(hasPermission("MANAGER", "billing.manage")).toBe(false);
  });

  it("ADMIN can manage integrations and users but billing.manage is Owner-only", () => {
    expect(hasPermission("ADMIN", "integrations.manage")).toBe(true);
    expect(hasPermission("ADMIN", "users.invite")).toBe(true);
    expect(hasPermission("ADMIN", "billing.manage")).toBe(false);
  });

  it("custom permissions can grant an additional permission beyond the base role", () => {
    expect(hasPermission("SALES_AGENT", "leads.export")).toBe(false);
    expect(hasPermission("SALES_AGENT", "leads.export", ["leads.export"])).toBe(true);
  });

  it("getPermissionsForRole never mutates the underlying role table", () => {
    const before = getPermissionsForRole("VIEWER").length;
    getPermissionsForRole("VIEWER", ["leads.create"]);
    expect(getPermissionsForRole("VIEWER").length).toBe(before);
  });
});
