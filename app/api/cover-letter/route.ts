import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runCoverLetter } from "@/lib/match-job";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { jobId?: string; profileId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { jobId, profileId } = body;
  if (!jobId || !profileId) {
    return NextResponse.json({ error: "jobId and profileId are required" }, { status: 400 });
  }

  const [job, profile] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId } }),
    prisma.userProfile.findUnique({ where: { id: profileId } }),
  ]);

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  try {
    const coverLetter = await runCoverLetter(job, profile);
    return NextResponse.json({ coverLetter });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
