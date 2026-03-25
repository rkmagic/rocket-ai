import type { Company } from "@prisma/client";
import { scrapeGreenhouse } from "@/lib/scrape/greenhouse";
import { scrapeLever } from "@/lib/scrape/lever";
import { scrapeCustom } from "@/lib/scrape/custom";
import type { ScrapedJob } from "@/lib/scrape/types";

export async function scrapeCompanyJobs(company: Company): Promise<ScrapedJob[]> {
  const p = company.platform.toLowerCase();
  if (p === "greenhouse") return scrapeGreenhouse(company.slug);
  if (p === "lever") return scrapeLever(company.slug);
  return scrapeCustom(company.careersUrl);
}
