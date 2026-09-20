import { redirect } from "next/navigation";
import { requireTenantContext } from "@/server/tenant";
import { prisma } from "@/server/db/client";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const ctx = await requireTenantContext();

  const tenant = await prisma.tenant.findUnique({ where: { id: ctx.tenant.id } });
  if (tenant?.onboardingCompletedAt) redirect("/dashboard");

  const pipeline = await prisma.pipeline.findFirst({
    where: { tenantId: ctx.tenant.id, isDefault: true },
    include: { stages: { orderBy: { sortOrder: "asc" } } },
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-center text-2xl font-bold">Welcome to MiniCRM, {ctx.session.user.fullName.split(" ")[0]}</h1>
      <p className="mt-2 text-center text-sm text-muted">Let&apos;s set up {ctx.tenant.companyName} in a few quick steps.</p>
      <div className="mt-10">
        <OnboardingWizard
          companyName={ctx.tenant.companyName}
          defaultStages={pipeline?.stages.map((s) => s.name) ?? []}
        />
      </div>
    </div>
  );
}
