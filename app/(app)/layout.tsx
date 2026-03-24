import { prisma } from "@/lib/prisma";
import { JobFilterProvider } from "@/components/job-filter-context";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const companies = await prisma.company.findMany({ orderBy: { name: "asc" } });

  return (
    <JobFilterProvider>
      <AppShell companies={companies}>{children}</AppShell>
    </JobFilterProvider>
  );
}
