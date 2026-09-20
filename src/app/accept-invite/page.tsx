import { prisma } from "@/server/db/client";
import { hashToken } from "@/lib/crypto";
import { AcceptForm } from "./accept-form";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return <Centered title="Invalid invitation" desc="This invitation link is missing a token." />;
  }

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { tenant: true },
  });

  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    return <Centered title="Invitation expired" desc="Ask a workspace admin to send you a new invitation." />;
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } });

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">Join {invitation.tenant.companyName}</h1>
      <p className="mt-2 text-sm text-muted">
        You&apos;ve been invited as {invitation.role.replace("_", " ").toLowerCase()}.
      </p>
      <div className="mt-8">
        <AcceptForm token={token} email={invitation.email} needsPassword={!existingUser} />
      </div>
    </div>
  );
}

function Centered({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted">{desc}</p>
    </div>
  );
}
