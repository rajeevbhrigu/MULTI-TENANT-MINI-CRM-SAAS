"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export function GlobalSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("q");
        if (q) router.push(`/search?q=${encodeURIComponent(String(q))}`);
      }}
      className="relative hidden max-w-md flex-1 sm:block"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        name="q"
        defaultValue={searchParams.get("q") ?? ""}
        placeholder="Search leads, customers, phone, email…"
        className="h-9 w-full rounded-md border border-border bg-muted-surface pl-9 pr-3 text-sm focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </form>
  );
}
