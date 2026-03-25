import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile } from "@/lib/profile";
import { runJobMatch } from "@/lib/match-job";
import { prefilterJob } from "@/lib/prefilter-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { profileId?: string; maxLlmMatches?: number; prefilterThreshold?: number; maxSkillTokens?: number };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const profile =
    body.profileId
      ? await prisma.userProfile.findUnique({ where: { id: body.profileId } })
      : await getActiveProfile();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const jobs = await prisma.job.findMany();
  if (!jobs.length) {
    return NextResponse.json({ matched: 0, totalJobs: 0 });
  }

  let matched = 0;
  const matchErrors: string[] = [];

  // Sequential loop keeps load predictable for the MVP (and avoids spiking the LLM provider).
  const MAX_LLM_MATCHES = typeof body.maxLlmMatches === "number" ? body.maxLlmMatches : 100;
  const prefilterThreshold = typeof body.prefilterThreshold === "number" ? body.prefilterThreshold : 25;
  const maxSkillTokens = typeof body.maxSkillTokens === "number" ? body.maxSkillTokens : 25;
  let llmCalls = 0;

  for (const job of jobs) {
    if (llmCalls >= MAX_LLM_MATCHES) break;
    try {
      // If job already has a score, only re-score when it still looks relevant to the updated profile.
      const shouldRescore =
        job.matchScore == null || prefilterJob(job, profile, { threshold: prefilterThreshold, maxSkillTokens }).passes;

      if (!shouldRescore) continue;

      await runJobMatch(job, profile, { maxSkillTokens });
      llmCalls += 1;
      matched += 1;
    } catch (e) {
      matchErrors.push(e instanceof Error ? e.message : "Match failed");
    }
  }

  return NextResponse.json({
    matched,
    totalJobs: jobs.length,
    matchErrors: matchErrors.length ? matchErrors : undefined,
  });
}

