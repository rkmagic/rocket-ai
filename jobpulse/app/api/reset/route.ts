import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Wipes all JobPulse data so the user can start from scratch.
 * MVP: single-tenant, no auth.
 */
export async function POST() {
  try {
    // Delete in order to satisfy FKs explicitly (even though cascades exist).
    await prisma.job.deleteMany();
    await prisma.company.deleteMany();
    await prisma.userProfile.deleteMany();

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Reset failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

