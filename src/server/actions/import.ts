"use server";

import { revalidatePath } from "next/cache";
import { withTenantContext } from "@/server/db/tenant-context";
import { requireTenantContext, requirePermission } from "@/server/tenant";
import { recordAudit } from "@/server/audit";
import { assertWithinLeadLimit, UsageLimitError } from "@/server/usage";

export type ImportRow = {
  name: string;
  mobile?: string;
  email?: string;
  company?: string;
  source?: string;
};

export type ImportResult = {
  imported: number;
  skipped: number;
  duplicates: number;
  errors: { row: number; message: string }[];
};

const VALID_SOURCES = new Set(["WHATSAPP", "FACEBOOK", "INSTAGRAM", "GMAIL", "WEBSITE", "REFERRAL", "MANUAL", "OTHER"]);

export async function importLeadsAction(rows: ImportRow[]): Promise<ImportResult> {
  const ctx = await requireTenantContext();
  requirePermission(ctx, "leads.import");

  const result: ImportResult = { imported: 0, skipped: 0, duplicates: 0, errors: [] };

  await withTenantContext(ctx.tenant.id, async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.name?.trim()) {
        result.skipped++;
        result.errors.push({ row: i + 1, message: "Missing name" });
        continue;
      }

      try {
        await assertWithinLeadLimit(ctx.tenant.id);
      } catch (e) {
        result.errors.push({ row: i + 1, message: e instanceof UsageLimitError ? e.message : "Limit reached" });
        break;
      }

      if (row.mobile || row.email) {
        const dup = await tx.lead.findFirst({
          where: {
            tenantId: ctx.tenant.id,
            deletedAt: null,
            OR: [
              ...(row.mobile ? [{ mobile: row.mobile }] : []),
              ...(row.email ? [{ email: row.email }] : []),
            ],
          },
        });
        if (dup) {
          result.duplicates++;
          continue;
        }
      }

      const source = row.source?.toUpperCase();
      const counter = await tx.leadCounter.update({ where: { tenantId: ctx.tenant.id }, data: { value: { increment: 1 } } });

      const lead = await tx.lead.create({
        data: {
          tenantId: ctx.tenant.id,
          leadNumber: counter.value,
          name: row.name.trim(),
          mobile: row.mobile || null,
          email: row.email || null,
          company: row.company || null,
          source: (source && VALID_SOURCES.has(source) ? source : "OTHER") as never,
          status: "NEW",
          createdById: ctx.session.user.id,
        },
      });

      await tx.activity.create({
        data: { tenantId: ctx.tenant.id, leadId: lead.id, userId: ctx.session.user.id, type: "LEAD_CREATED", channel: "MANUAL", subject: "Imported from CSV" },
      });

      result.imported++;
    }
  });

  await recordAudit({
    tenantId: ctx.tenant.id,
    actorUserId: ctx.session.user.id,
    action: "leads.imported",
    entityType: "Lead",
    newValues: result,
  });

  revalidatePath("/leads");
  return result;
}
