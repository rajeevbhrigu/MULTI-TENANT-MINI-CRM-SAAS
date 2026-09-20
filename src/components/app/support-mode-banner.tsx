import { ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { endSupportSessionAction } from "@/server/actions/platform-admin";

export function SupportModeBanner({ adminName, startedAt }: { adminName: string; startedAt: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-warning px-4 py-2 text-sm font-medium text-white">
      <span className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4" />
        SUPPORT MODE — {adminName} is viewing this workspace ({formatDistanceToNow(new Date(startedAt), { addSuffix: true })})
      </span>
      <form action={endSupportSessionAction}>
        <button type="submit" className="rounded-md bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30">
          End support access
        </button>
      </form>
    </div>
  );
}
