/**
 * Demo/dev seed data. Clearly separate from production: this script must
 * never be run against a production database (guarded below) and every
 * seeded workspace is named "Demo" so it can never be mistaken for a real
 * customer or a live integration.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_PLANS, DEFAULT_PIPELINE_STAGES } from "../src/server/defaults";

const prisma = new PrismaClient();

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to run demo seed data against a production environment.");
}

const FIRST_NAMES = ["Aarav", "Vivaan", "Aditya", "Ishaan", "Kabir", "Ananya", "Diya", "Priya", "Meera", "Saanvi", "Rohan", "Kavya", "Arjun", "Neha", "Rahul", "Pooja"];
const LAST_NAMES = ["Sharma", "Verma", "Gupta", "Mehta", "Patel", "Reddy", "Iyer", "Nair", "Singh", "Kapoor", "Joshi", "Malhotra"];
const COMPANIES = ["Bright Retail", "Skyline Realty", "GreenLeaf Foods", "Nova Fintech", "Bluewave Media", "Crestline Interiors", "Orbit Logistics", "Sunrise Education", null];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomPhone(): string {
  return `9${Math.floor(100000000 + Math.random() * 899999999)}`;
}
function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log("Seeding demo data...");

  for (const p of DEFAULT_PLANS) {
    await prisma.plan.upsert({ where: { code: p.code }, update: {}, create: p });
  }
  const growthPlan = await prisma.plan.findUniqueOrThrow({ where: { code: "growth" } });

  const passwordHash = await bcrypt.hash("DemoPass123!", 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "acme-demo" },
    update: {},
    create: {
      companyName: "Acme Digital Solutions (Demo)",
      slug: "acme-demo",
      industry: "E-commerce",
      teamSize: "6-20",
      timezone: "Asia/Kolkata",
      currency: "INR",
      country: "India",
      onboardingCompletedAt: new Date(),
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@minicrm-demo.example" },
    update: {},
    create: { fullName: "John Kuy", email: "owner@minicrm-demo.example", passwordHash, emailVerifiedAt: new Date() },
  });
  const admin = await prisma.user.upsert({
    where: { email: "admin@minicrm-demo.example" },
    update: {},
    create: { fullName: "Priya Sharma", email: "admin@minicrm-demo.example", passwordHash, emailVerifiedAt: new Date() },
  });
  const manager = await prisma.user.upsert({
    where: { email: "manager@minicrm-demo.example" },
    update: {},
    create: { fullName: "Rohan Verma", email: "manager@minicrm-demo.example", passwordHash, emailVerifiedAt: new Date() },
  });
  const agent1 = await prisma.user.upsert({
    where: { email: "agent1@minicrm-demo.example" },
    update: {},
    create: { fullName: "Ananya Gupta", email: "agent1@minicrm-demo.example", passwordHash, emailVerifiedAt: new Date() },
  });
  const agent2 = await prisma.user.upsert({
    where: { email: "agent2@minicrm-demo.example" },
    update: {},
    create: { fullName: "Kabir Mehta", email: "agent2@minicrm-demo.example", passwordHash, emailVerifiedAt: new Date() },
  });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;

    for (const [user, role] of [[owner, "OWNER"], [admin, "ADMIN"], [manager, "MANAGER"], [agent1, "SALES_AGENT"], [agent2, "SALES_AGENT"]] as const) {
      await tx.tenantUser.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
        update: {},
        create: { tenantId: tenant.id, userId: user.id, role, status: "ACTIVE" },
      });
    }

    await tx.subscription.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: {
        tenantId: tenant.id, planId: growthPlan.id, status: "ACTIVE",
        currentPeriodStart: new Date(), currentPeriodEnd: daysFromNow(30), provider: "mock",
      },
    });

    await tx.leadCounter.upsert({ where: { tenantId: tenant.id }, update: {}, create: { tenantId: tenant.id, value: 0 } });

    let pipeline = await tx.pipeline.findFirst({ where: { tenantId: tenant.id, isDefault: true } });
    if (!pipeline) {
      pipeline = await tx.pipeline.create({ data: { tenantId: tenant.id, name: "Sales Pipeline", type: "SALES", isDefault: true } });
      for (let i = 0; i < DEFAULT_PIPELINE_STAGES.length; i++) {
        const s = DEFAULT_PIPELINE_STAGES[i];
        await tx.pipelineStage.create({ data: { tenantId: tenant.id, pipelineId: pipeline.id, name: s.name, status: s.status, color: s.color, sortOrder: i } });
      }
    }
    const stages = await tx.pipelineStage.findMany({ where: { pipelineId: pipeline.id } });

    const tagNames = ["VIP", "High Value", "Demo Required", "Price Sensitive", "Repeat Customer", "Referral"];
    const tags = [];
    for (const name of tagNames) {
      tags.push(await tx.tag.upsert({ where: { tenantId_name: { tenantId: tenant.id, name } }, update: {}, create: { tenantId: tenant.id, name } }));
    }

    const campaignDefs = [
      { name: "Spring Sale — Facebook", platform: "FACEBOOK" as const, externalId: "fb_campaign_001" },
      { name: "Google Search — Brand", platform: "WEBSITE" as const, externalId: "gads_002" },
      { name: "Instagram Promo — Reels", platform: "INSTAGRAM" as const, externalId: "ig_promo_003" },
    ];
    const campaigns = [];
    for (const c of campaignDefs) {
      const existing = await tx.campaign.findFirst({ where: { tenantId: tenant.id, name: c.name } });
      campaigns.push(existing ?? await tx.campaign.create({
        data: { tenantId: tenant.id, name: c.name, platform: c.platform, campaignIdExternal: c.externalId, startDate: daysFromNow(-60), budget: 25000 + Math.random() * 50000 },
      }));
    }

    const agents = [agent1, agent2, manager];
    const sources = ["WHATSAPP", "FACEBOOK", "INSTAGRAM", "GMAIL", "WEBSITE", "REFERRAL", "MANUAL"] as const;
    const statuses = ["NEW", "QUALIFIED", "HOT", "FOLLOW_UP", "HOLD", "SALE", "LOST", "INVALID"] as const;
    const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

    const existingLeadCount = await tx.lead.count({ where: { tenantId: tenant.id } });
    const toCreate = Math.max(0, 50 - existingLeadCount);

    for (let i = 0; i < toCreate; i++) {
      const counter = await tx.leadCounter.update({ where: { tenantId: tenant.id }, data: { value: { increment: 1 } } });
      const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      const status = pick([...statuses]);
      const priority = pick([...priorities]);
      const source = pick([...sources]);
      const assignedTo = Math.random() > 0.15 ? pick(agents) : null;
      const campaign = Math.random() > 0.5 ? pick(campaigns) : null;
      const createdAt = daysFromNow(-Math.floor(Math.random() * 60));

      const lead = await tx.lead.create({
        data: {
          tenantId: tenant.id, leadNumber: counter.value, name,
          mobile: randomPhone(), email: `${name.toLowerCase().replace(" ", ".")}${i}@example.com`,
          company: pick(COMPANIES), source, status, priority,
          assignedToId: assignedTo?.id, createdById: owner.id,
          campaignId: campaign?.id, createdAt, lastActivityAt: createdAt,
          nextFollowupAt: status === "FOLLOW_UP" ? daysFromNow(Math.floor(Math.random() * 6) - 2) : null,
        },
      });

      await tx.leadStatusHistory.create({ data: { tenantId: tenant.id, leadId: lead.id, newStatus: "NEW", reason: "Lead created", changedAt: createdAt } });
      if (status !== "NEW") {
        await tx.leadStatusHistory.create({ data: { tenantId: tenant.id, leadId: lead.id, oldStatus: "NEW", newStatus: status, reason: "Demo progression", changedById: assignedTo?.id } });
      }

      const stage = stages.find((s) => s.status === status);
      if (stage) {
        await tx.leadPipelineStage.create({ data: { tenantId: tenant.id, leadId: lead.id, pipelineId: pipeline.id, stageId: stage.id, dealValue: status === "SALE" ? 15000 + Math.random() * 85000 : null } });
      }

      const activityChannel = (["WHATSAPP", "FACEBOOK", "INSTAGRAM", "GMAIL"] as const).includes(source as never) ? (source as "WHATSAPP" | "FACEBOOK" | "INSTAGRAM" | "GMAIL") : "MANUAL";
      await tx.activity.create({ data: { tenantId: tenant.id, leadId: lead.id, userId: assignedTo?.id ?? owner.id, type: "LEAD_CREATED", channel: activityChannel, subject: "Lead created", createdAt } });
      if (Math.random() > 0.5) {
        await tx.activity.create({ data: { tenantId: tenant.id, leadId: lead.id, userId: assignedTo?.id ?? owner.id, type: "CALL", channel: "CALL", subject: "Discovery call", description: "Discussed requirements and budget." } });
      }
      if (Math.random() > 0.7) {
        await tx.note.create({ data: { tenantId: tenant.id, leadId: lead.id, userId: assignedTo?.id ?? owner.id, content: "Follow up next week with pricing details." } });
      }
      if (Math.random() > 0.6) {
        await tx.leadTag.create({ data: { leadId: lead.id, tagId: pick(tags).id } }).catch(() => undefined);
      }

      if (status === "SALE" && Math.random() > 0.5) {
        const customer = await tx.customer.create({
          data: { tenantId: tenant.id, leadId: lead.id, name: lead.name, mobile: lead.mobile, email: lead.email, company: lead.company, ownerId: assignedTo?.id },
        });
        await tx.lead.update({ where: { id: lead.id }, data: { status: "CUSTOMER" } });
        await tx.leadStatusHistory.create({ data: { tenantId: tenant.id, leadId: lead.id, oldStatus: "SALE", newStatus: "CUSTOMER", reason: "Converted (demo)" } });
        await tx.activity.create({ data: { tenantId: tenant.id, leadId: lead.id, customerId: customer.id, type: "CONVERSION", channel: "MANUAL", subject: "Converted to customer" } });
      }

      if (status === "FOLLOW_UP") {
        await tx.followup.create({
          data: {
            tenantId: tenant.id, leadId: lead.id, assignedToId: assignedTo?.id ?? owner.id,
            title: "Follow up on proposal", dueDate: lead.nextFollowupAt ?? daysFromNow(1), priority,
            createdById: owner.id,
          },
        });
      }
    }

    // A couple of mock-mode integration connections so /integrations and /inbox aren't empty.
    for (const provider of ["WHATSAPP", "FACEBOOK"] as const) {
      await tx.integrationConnection.upsert({
        where: { tenantId_provider: { tenantId: tenant.id, provider } },
        update: {},
        create: { tenantId: tenant.id, provider, mode: "MOCK", status: "CONNECTED", externalAccountId: `${provider.toLowerCase()}_demo_account`, connectedAt: new Date(), connectedById: owner.id },
      });
    }

    await tx.automationRule.upsert({
      where: { id: "00000000-0000-0000-0000-000000000001" },
      update: {},
      create: {
        id: "00000000-0000-0000-0000-000000000001",
        tenantId: tenant.id, name: "Auto-assign urgent leads", triggerEvent: "LEAD_CREATED",
        conditions: [{ field: "priority", op: "eq", value: "URGENT" }],
        actions: [{ type: "assign_round_robin" }, { type: "create_followup", hoursFromNow: 2, title: "Call urgent lead" }, { type: "notify_manager", title: "New urgent lead needs attention" }],
      },
    }).catch(() => undefined);

    await tx.notification.createMany({
      data: [
        { tenantId: tenant.id, userId: owner.id, type: "SYSTEM", title: "Welcome to MiniCRM", body: "Your demo workspace is ready to explore." },
        { tenantId: tenant.id, userId: owner.id, type: "BILLING", title: "Trial started", body: "Your Growth plan trial is active." },
      ],
    });
  }, { timeout: 60_000 });

  console.log("Seed complete.");
  console.log("Login with: owner@minicrm-demo.example / DemoPass123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
