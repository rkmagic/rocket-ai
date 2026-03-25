import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeCompanyJobs } from "@/lib/scrape";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin scrape-only endpoint.
 * - Creates/updates `Company` via existing DB entries (companyId must exist).
 * - Scrapes jobs and inserts new job rows.
 * - Does NOT run AI match scoring (no Claude calls).
 */
export async function POST(req: Request) {
  const overallStart = Date.now();
  let body: { companyId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const companyId = body.companyId;
  if (!companyId || typeof companyId !== "string") {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  let scraped;
  let scrapeMs = 0;
  try {
    const scrapeStart = Date.now();
    scraped = await scrapeCompanyJobs(company);
    scrapeMs = Date.now() - scrapeStart;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Scrape failed";
    return NextResponse.json(
      { error: message, created: 0, totalScraped: 0, timings: { totalMs: Date.now() - overallStart, scrapeMs } },
      { status: 502 },
    );
  }

  let created = 0;
  const dbStart = Date.now();

  // Insert jobs efficiently (dedupe is enforced by Job.url unique constraint).
  // We also dedupe within this request by URL to avoid duplicate entries in a single createMany call.
  const uniqueByUrl = new Set<string>();
  const toCreate = scraped
    .filter((j) => {
      if (uniqueByUrl.has(j.url)) return false;
      uniqueByUrl.add(j.url);
      return true;
    })
    .map((j) => ({
      title: j.title,
      description: j.description,
      location: j.location ?? null,
      url: j.url,
      companyId: company.id,
    }));

  const chunkSize = 500;
  for (let i = 0; i < toCreate.length; i += chunkSize) {
    const chunk = toCreate.slice(i, i + chunkSize);
    const res = await prisma.job.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    created += res.count;
  }

  const dbMs = Date.now() - dbStart;
  const totalMs = Date.now() - overallStart;
  return NextResponse.json({
    created,
    totalScraped: scraped.length,
    timings: {
      totalMs,
      scrapeMs,
      dbMs,
    },
  });
}

