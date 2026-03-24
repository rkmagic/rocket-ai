import { prisma } from "@/lib/prisma";
import { CompaniesManager } from "@/components/companies-manager";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await prisma.company.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <CompaniesManager initial={companies} />
    </div>
  );
}
