import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile } from "@/lib/profile";
import { runJobMatch } from "@/lib/match-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { profileId?: string };
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
  for (const job of jobs) {
    try {
      await runJobMatch(job, profile);
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

