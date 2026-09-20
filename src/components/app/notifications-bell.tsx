"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/server/actions/notifications";

export type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  readAt: string | null;
  createdAt: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
};

function hrefFor(n: NotificationItem): string {
  if (n.relatedEntityType === "Lead" && n.relatedEntityId) return `/leads/${n.relatedEntityId}`;
  if (n.relatedEntityType === "Followup" && n.relatedEntityId) return `/followups`;
  return "#";
}

export function NotificationsBell({ items, unreadCount }: { items: NotificationItem[]; unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted-surface"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-danger" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-md border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={() => startTransition(() => markAllNotificationsReadAction())}
                className="text-xs font-medium text-brand hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">No notifications yet.</p>}
            {items.map((n) => (
              <Link
                key={n.id}
                href={hrefFor(n)}
                onClick={() => {
                  if (!n.readAt) startTransition(() => markNotificationReadAction(n.id));
                  setOpen(false);
                }}
                className={`block border-b border-border px-4 py-3 text-sm last:border-0 hover:bg-muted-surface ${!n.readAt ? "bg-brand-soft/30" : ""}`}
              >
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="mt-0.5 text-xs text-muted">{n.body}</p>}
                <p className="mt-1 text-xs text-muted">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
