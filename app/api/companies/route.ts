import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const companies = await prisma.company.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(companies);
}

type CompanyBody = {
  name?: string;
  careersUrl?: string;
  platform?: string;
  slug?: string;
};

export async function POST(req: Request) {
  let body: CompanyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, careersUrl, platform, slug } = body;
  if (!name?.trim() || !careersUrl?.trim() || !platform?.trim()) {
    return NextResponse.json({ error: "name, careersUrl, and platform are required" }, { status: 400 });
  }

  const p = platform.toLowerCase();
  if (p !== "greenhouse" && p !== "lever" && p !== "custom") {
    return NextResponse.json({ error: "platform must be greenhouse, lever, or custom" }, { status: 400 });
  }

  let resolvedSlug = slug?.trim() || "";
  if ((p === "greenhouse" || p === "lever") && !resolvedSlug) {
    return NextResponse.json({ error: "slug is required for greenhouse and lever" }, { status: 400 });
  }
  if (p === "custom") {
    resolvedSlug = resolvedSlug || "custom";
  }

  const company = await prisma.company.create({
    data: {
      name: name.trim(),
      careersUrl: careersUrl.trim(),
      platform: p,
      slug: resolvedSlug,
    },
  });

  return NextResponse.json(company);
}
