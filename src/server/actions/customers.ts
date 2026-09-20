"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/server/db/tenant-context";
import { requireTenantContext, requirePermission } from "@/server/tenant";
import { recordAudit } from "@/server/audit";

export async function convertLeadToCustomerAction(formData: FormData): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "customers.create");

  const leadId = String(formData.get("leadId") ?? "");
  const mode = String(formData.get("mode") ?? "new");
  const existingCustomerId = String(formData.get("existingCustomerId") ?? "") || null;

  const lead = await withTenantContext(ctx.tenant.id, (tx) => tx.lead.findFirst({ where: { id: leadId, tenantId: ctx.tenant.id } }));
  if (!lead) throw new Error("Lead not found");

  const customer = await withTenantContext(ctx.tenant.id, async (tx) => {
    let customer;
    if (mode === "existing" && existingCustomerId) {
      customer = await tx.customer.update({
        where: { id: existingCustomerId },
        data: { leadId: lead.id },
      });
    } else {
      customer = await tx.customer.create({
        data: {
          tenantId: ctx.tenant.id,
          leadId: lead.id,
          name: lead.name,
          mobile: lead.mobile,
          email: lead.email,
          company: lead.company,
          ownerId: lead.assignedToId,
        },
      });
    }

    // Lead is preserved (never deleted); status moves to CUSTOMER and its
    // full history, activities, notes and conversations remain attached.
    await tx.lead.update({ where: { id: leadId }, data: { status: "CUSTOMER" } });
    await tx.leadStatusHistory.create({
      data: { tenantId: ctx.tenant.id, leadId, oldStatus: lead.status, newStatus: "CUSTOMER", changedById: ctx.session.user.id, reason: "Converted to customer" },
    });
    await tx.activity.create({
      data: {
        tenantId: ctx.tenant.id, leadId, customerId: customer.id, userId: ctx.session.user.id,
        type: "CONVERSION", channel: "MANUAL", subject: "Converted to customer",
      },
    });

    return customer;
  });

  await recordAudit({
    tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "lead.converted",
    entityType: "Customer", entityId: customer.id, newValues: { leadId, mode },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomerAction(customerId: string, formData: FormData): Promise<void> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "customers.edit");

  const data = {
    name: String(formData.get("name") ?? "").trim(),
    mobile: String(formData.get("mobile") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    company: String(formData.get("company") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
  };

  await withTenantContext(ctx.tenant.id, (tx) =>
    tx.customer.updateMany({ where: { id: customerId, tenantId: ctx.tenant.id }, data }),
  );

  await recordAudit({ tenantId: ctx.tenant.id, actorUserId: ctx.session.user.id, action: "customer.updated", entityType: "Customer", entityId: customerId, newValues: data });

  revalidatePath(`/customers/${customerId}`);
}
