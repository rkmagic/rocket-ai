import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeCompanyJobs } from "@/lib/scrape";
import { getActiveProfile } from "@/lib/profile";
import { runJobMatch } from "@/lib/match-job";

export const runtime = "nodejs";

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
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  let scraped;
  try {
    scraped = await scrapeCompanyJobs(company);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Scrape failed";
    return NextResponse.json({ error: message, created: 0, matched: 0 }, { status: 502 });
  }

  const profile = await getActiveProfile();
  const newJobIds: string[] = [];

  for (const job of scraped) {
    const existing = await prisma.job.findUnique({ where: { url: job.url } });
    if (existing) continue;

    const created = await prisma.job.create({
      data: {
        title: job.title,
        description: job.description,
        location: job.location,
        url: job.url,
        companyId: company.id,
      },
    });
    newJobIds.push(created.id);
  }

  let matched = 0;
  const matchErrors: string[] = [];

  if (profile && newJobIds.length > 0) {
    for (const jobId of newJobIds) {
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) continue;
      try {
        await runJobMatch(job, profile);
        matched += 1;
      } catch (e) {
        matchErrors.push(e instanceof Error ? e.message : "Match failed");
      }
    }
  }

  return NextResponse.json({
    created: newJobIds.length,
    matched,
    totalScraped: scraped.length,
    matchErrors: matchErrors.length ? matchErrors : undefined,
  });
}
