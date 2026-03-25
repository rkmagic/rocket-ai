import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const STATUSES = new Set(["new", "applied", "rejected", "interview", "offer"]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status = body.status;
  if (!status || !STATUSES.has(status)) {
    return NextResponse.json(
      { error: "status must be one of: new, applied, rejected, interview, offer" },
      { status: 400 },
    );
  }

  try {
    const job = await prisma.job.update({
      where: { id },
      data: { status },
      include: { company: true },
    });
    return NextResponse.json(job);
  } catch {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
}
