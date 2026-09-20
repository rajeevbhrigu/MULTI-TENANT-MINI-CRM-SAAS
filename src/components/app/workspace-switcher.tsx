"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import Link from "next/link";
import { switchTenantAction } from "@/server/actions/workspace";

export type WorkspaceOption = { id: string; companyName: string; role: string };

export function WorkspaceSwitcher({ current, options }: { current: WorkspaceOption; options: WorkspaceOption[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative border-t border-border p-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted-surface"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-soft text-xs font-semibold text-brand">
          {current.companyName.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{current.companyName}</span>
          <span className="block truncate text-xs text-muted">{current.role}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 text-muted" />
      </button>
      {open && (
        <div className="absolute bottom-full left-3 right-3 mb-2 rounded-md border border-border bg-surface shadow-lg">
          <div className="max-h-64 overflow-y-auto p-1 scrollbar-thin">
            {options.map((o) => (
              <button
                key={o.id}
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  if (o.id !== current.id) startTransition(() => switchTenantAction(o.id));
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted-surface"
              >
                <span className="flex-1 truncate text-left">{o.companyName}</span>
                {o.id === current.id && <Check className="h-4 w-4 text-brand" />}
              </button>
            ))}
          </div>
          <div className="border-t border-border p-1">
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted hover:bg-muted-surface"
            >
              <Plus className="h-4 w-4" /> Create workspace
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
