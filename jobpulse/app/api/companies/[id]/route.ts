import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    await prisma.company.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
