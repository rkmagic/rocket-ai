"use client";

import type { Company } from "@prisma/client";
import { AppSidebar } from "@/components/app-sidebar";

/**
 * Sidebar is position:fixed so it stays pinned while the main column scrolls.
 * Without this, a tall main area + h-screen sidebar in a flex row causes layout/scroll glitches.
 */
export function AppShell({ companies, children }: { companies: Company[]; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#fafaf9]">
      <div className="fixed left-0 top-0 z-40 flex h-dvh w-64 flex-col border-r border-slate-800 bg-[#0f172a] shadow-lg">
        <AppSidebar companies={companies} />
      </div>
      <main className="min-h-dvh w-full overflow-x-hidden pl-64">{children}</main>
    </div>
  );
}
