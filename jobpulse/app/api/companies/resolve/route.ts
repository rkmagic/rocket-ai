import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyByName } from "@/lib/resolve-company";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { names?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const names = (body.names ?? []).map((n) => String(n).trim()).filter(Boolean);
  if (!names.length) {
    return NextResponse.json({ error: "Provide company names" }, { status: 400 });
  }

  const createdOrExisting: Array<{
    id: string;
    name: string;
    platform: string;
    slug: string;
    careersUrl: string;
  }> = [];
  const unresolved: string[] = [];

  for (const companyName of names) {
    const resolved = await resolveCompanyByName(companyName);
    if (!resolved) {
      unresolved.push(companyName);
      continue;
    }

    const existing = await prisma.company.findFirst({
      where: { slug: resolved.slug, platform: resolved.platform },
    });

    const company = existing
      ? existing
      : await prisma.company.create({
          data: {
            name: companyName,
            careersUrl: resolved.careersUrl,
            platform: resolved.platform,
            slug: resolved.slug,
          },
        });

    createdOrExisting.push({
      id: company.id,
      name: company.name,
      platform: company.platform,
      slug: company.slug,
      careersUrl: company.careersUrl,
    });
  }

  return NextResponse.json({ companies: createdOrExisting, unresolved });
}

