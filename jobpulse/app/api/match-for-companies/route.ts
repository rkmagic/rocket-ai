import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile } from "@/lib/profile";
import { runJobMatch } from "@/lib/match-job";
import { buildPrefilterTokens, prefilterJobWithTokens } from "@/lib/prefilter-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const overallStart = Date.now();
  let body: {
    profileId?: string;
    companyIds?: string[];
    maxLlmMatches?: number;
    prefilterThreshold?: number;
    maxSkillTokens?: number;
    maxJobsToConsider?: number;
  };

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const profile =
    body.profileId != null
      ? await prisma.userProfile.findUnique({ where: { id: body.profileId } })
      : await getActiveProfile();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const companyIds = (body.companyIds ?? []).filter((x) => typeof x === "string" && x.trim().length > 0);

  // Only match against explicit companies for performance.
  if (!companyIds.length) {
    return NextResponse.json({ error: "Provide companyIds" }, { status: 400 });
  }

  const maxLlmMatches = typeof body.maxLlmMatches === "number" ? body.maxLlmMatches : 100;
  const prefilterThreshold = typeof body.prefilterThreshold === "number" ? body.prefilterThreshold : 25;
  const maxSkillTokens = typeof body.maxSkillTokens === "number" ? body.maxSkillTokens : 25;
  const maxJobsToConsider = typeof body.maxJobsToConsider === "number" ? body.maxJobsToConsider : 2000;

  const prefilterTokens = buildPrefilterTokens(profile, { maxSkillTokens });

  // Limit jobs considered so the endpoint stays responsive even if you scraped a big board.
  const jobs = await prisma.job.findMany({
    where: { companyId: { in: companyIds }, matchScore: null },
    orderBy: { firstSeenAt: "desc" },
    take: maxJobsToConsider,
  });

  type Candidate = { jobId: string; job: (typeof jobs)[number]; preScore: number };

  const candidates: Candidate[] = [];
  const prefilterStart = Date.now();
  for (const job of jobs) {
    const pre = prefilterJobWithTokens(job, prefilterTokens, { threshold: prefilterThreshold });
    if (!pre.passes) continue;
    candidates.push({ jobId: job.id, job, preScore: pre.score });
  }
  const prefilterMs = Date.now() - prefilterStart;

  candidates.sort((a, b) => b.preScore - a.preScore);
  const selected = candidates.slice(0, maxLlmMatches);

  let matched = 0;
  const matchErrors: string[] = [];

  const matchStart = Date.now();
  for (const c of selected) {
    try {
      await runJobMatch(c.job, profile, { maxSkillTokens, prefilterTokens });
      matched += 1;
    } catch (e) {
      matchErrors.push(e instanceof Error ? e.message : "Match failed");
    }
  }
  const matchMs = Date.now() - matchStart;

  return NextResponse.json({
    matched,
    consideredJobs: jobs.length,
    prefilterPassed: candidates.length,
    llmCalled: selected.length,
    matchErrors: matchErrors.length ? matchErrors : undefined,
    timings: {
      totalMs: Date.now() - overallStart,
      prefilterMs,
      matchMs,
    },
  });
}

