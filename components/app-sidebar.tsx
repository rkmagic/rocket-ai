"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Company } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useJobFilters } from "@/components/job-filter-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
  { href: "/companies", label: "Companies" },
];

export function AppSidebar({ companies }: { companies: Company[] }) {
  const pathname = usePathname();
  const { selectedCompanyIds, toggleCompany, clearCompanies } = useJobFilters();

  return (
    <aside className="flex h-full min-h-0 w-full flex-col text-slate-100">
      <div className="shrink-0 p-6">
        <Link href="/" className="font-heading text-xl font-bold tracking-tight text-white">
          JobPulse
        </Link>
        <p className="mt-1 text-xs text-slate-400">Calm job search, one place.</p>
      </div>
      <nav className="shrink-0 flex flex-col gap-1 px-3">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href ? "bg-teal-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Separator className="my-4 shrink-0 bg-slate-800" />
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-3 pb-6">
        <div className="flex shrink-0 items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Companies</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-teal-400 hover:bg-slate-800 hover:text-teal-300"
            onClick={clearCompanies}
          >
            All
          </Button>
        </div>
        <p className="shrink-0 px-1 text-[11px] leading-snug text-slate-500">
          Toggle to filter the dashboard. None selected shows every company.
        </p>
        <ul className="flex flex-col gap-1 pb-2">
          {companies.map((c) => {
            const active = selectedCompanyIds.includes(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => toggleCompany(c.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                    active ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/60",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 rounded border",
                      active ? "border-teal-500 bg-teal-600" : "border-slate-600",
                    )}
                  />
                  <span className="truncate">{c.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
