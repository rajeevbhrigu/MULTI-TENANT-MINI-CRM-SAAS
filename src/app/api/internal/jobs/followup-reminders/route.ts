import { NextRequest, NextResponse } from "next/server";
import { runFollowupReminders } from "@/server/jobs/followup-reminders";

/**
 * Internal job endpoint, meant to be invoked by a scheduler (cron, Vercel
 * Cron, GitHub Actions schedule, etc.) - not by end users. Protected by a
 * shared secret rather than a user session since no user is present.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-internal-job-token");
  if (!process.env.INTERNAL_JOB_TOKEN || token !== process.env.INTERNAL_JOB_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runFollowupReminders();
  return NextResponse.json(result);
}
