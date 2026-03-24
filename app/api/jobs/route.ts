import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyIdsRaw = searchParams.get("companyIds");
  const status = searchParams.get("status");
  const minScoreRaw = searchParams.get("minScore");

  const where: {
    companyId?: { in: string[] };
    status?: string;
    matchScore?: { gte: number };
  } = {};

  if (companyIdsRaw) {
    const ids = companyIdsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length) {
      where.companyId = { in: ids };
    }
  }

  if (status && status !== "all") {
    where.status = status;
  }

  if (minScoreRaw !== null && minScoreRaw !== "") {
    const min = Number(minScoreRaw);
    if (!Number.isNaN(min)) {
      where.matchScore = { gte: min };
    }
  }

  const jobs = await prisma.job.findMany({
    where,
    include: { company: true },
  });

  jobs.sort((a, b) => {
    const sa = a.matchScore ?? -1;
    const sb = b.matchScore ?? -1;
    if (sb !== sa) return sb - sa;
    return new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime();
  });

  return NextResponse.json(jobs);
}
