import { redirect } from "next/navigation";
import { requireTenantContext } from "@/server/tenant";
import { prisma } from "@/server/db/client";
import { Sidebar } from "@/components/app/sidebar";
import { MobileNav } from "@/components/app/mobile-nav";
import { GlobalSearch } from "@/components/app/global-search";
import { NotificationsBell, type NotificationItem } from "@/components/app/notifications-bell";
import { ProfileMenu } from "@/components/app/profile-menu";
import { WorkspaceSwitcher } from "@/components/app/workspace-switcher";
import { SupportModeBanner } from "@/components/app/support-mode-banner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireTenantContext();

  const tenant = await prisma.tenant.findUnique({ where: { id: ctx.tenant.id } });
  if (tenant && !tenant.onboardingCompletedAt) redirect("/onboarding");

  const [memberships, notifications, unreadCount, activeSupportSession] = await Promise.all([
    prisma.tenantUser.findMany({
      where: { userId: ctx.session.user.id, status: "ACTIVE" },
      include: { tenant: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.notification.findMany({
      where: { tenantId: ctx.tenant.id, userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.notification.count({
      where: { tenantId: ctx.tenant.id, userId: ctx.session.user.id, readAt: null },
    }),
    prisma.supportAccessSession.findFirst({
      where: { tenantId: ctx.tenant.id, endedAt: null },
      include: { admin: true },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const workspaceOptions = memberships.map((m) => ({
    id: m.tenant.id,
    companyName: m.tenant.companyName,
    role: m.role,
  }));

  const notificationItems: NotificationItem[] = notifications.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    type: n.type,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
    relatedEntityType: n.relatedEntityType,
    relatedEntityId: n.relatedEntityId,
  }));

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex w-60 flex-col">
        <Sidebar />
        <WorkspaceSwitcher
          current={{ id: ctx.tenant.id, companyName: ctx.tenant.companyName, role: ctx.membership.role }}
          options={workspaceOptions}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {activeSupportSession && (
          <SupportModeBanner adminName={activeSupportSession.admin.fullName} startedAt={activeSupportSession.startedAt.toISOString()} />
        )}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-4 sm:px-6">
          <MobileNav />
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-2">
            <NotificationsBell items={notificationItems} unreadCount={unreadCount} />
            <ProfileMenu
              name={ctx.session.user.fullName}
              email={ctx.session.user.email}
              avatarUrl={ctx.session.user.avatarUrl}
            />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
