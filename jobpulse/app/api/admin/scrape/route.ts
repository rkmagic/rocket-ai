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
  try {
    scraped = await scrapeCompanyJobs(company);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Scrape failed";
    return NextResponse.json({ error: message, created: 0, totalScraped: 0 }, { status: 502 });
  }

  let created = 0;
  // Insert missing jobs (dedupe is enforced by Job.url unique constraint).
  for (const j of scraped) {
    const existing = await prisma.job.findUnique({ where: { url: j.url } });
    if (existing) continue;
    await prisma.job.create({
      data: {
        title: j.title,
        description: j.description,
        location: j.location,
        url: j.url,
        companyId: company.id,
      },
    });
    created += 1;
  }

  return NextResponse.json({
    created,
    totalScraped: scraped.length,
  });
}

