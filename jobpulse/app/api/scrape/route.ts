import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeCompanyJobs } from "@/lib/scrape";
import { getActiveProfile } from "@/lib/profile";
import { runJobMatch } from "@/lib/match-job";
import { prefilterJob } from "@/lib/prefilter-job";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { companyId?: string; maxLlmMatches?: number; prefilterThreshold?: number; maxSkillTokens?: number };
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
    // Safety to avoid spending too long/calling the LLM excessively on very large boards.
    // You can raise this if you want broader scanning.
    const MAX_LLM_MATCHES = typeof body.maxLlmMatches === "number" ? body.maxLlmMatches : 50;
    const prefilterThreshold = typeof body.prefilterThreshold === "number" ? body.prefilterThreshold : 25;
    const maxSkillTokens = typeof body.maxSkillTokens === "number" ? body.maxSkillTokens : 25;
    let llmCalls = 0;

    for (const jobId of newJobIds) {
      if (llmCalls >= MAX_LLM_MATCHES) break;
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) continue;
      try {
        const pre = prefilterJob(job, profile, { threshold: prefilterThreshold, maxSkillTokens });
        if (!pre.passes) continue;

        await runJobMatch(job, profile, { maxSkillTokens });
        llmCalls += 1;
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
