import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, PROFILE_COOKIE_NAME } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getActiveProfile();
  return NextResponse.json(profile);
}

type ProfileBody = {
  name?: string;
  email?: string;
  targetRoles?: string;
  skills?: string;
  experienceYears?: number;
  experienceSummary?: string;
  resumeText?: string | null;
};

export async function PUT(req: Request) {
  let body: ProfileBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    name,
    email,
    targetRoles,
    skills,
    experienceYears,
    experienceSummary,
    resumeText,
  } = body;

  if (
    !name ||
    !email ||
    targetRoles === undefined ||
    skills === undefined ||
    experienceYears === undefined ||
    !experienceSummary
  ) {
    return NextResponse.json(
      { error: "name, email, targetRoles, skills, experienceYears, and experienceSummary are required" },
      { status: 400 },
    );
  }

  if (typeof experienceYears !== "number" || Number.isNaN(experienceYears)) {
    return NextResponse.json({ error: "experienceYears must be a number" }, { status: 400 });
  }

  const existing = await getActiveProfile();

  const data = {
    name,
    email,
    targetRoles,
    skills,
    experienceYears: Math.max(0, Math.round(experienceYears)),
    experienceSummary,
    resumeText: resumeText ?? null,
  };

  const profile = existing
    ? await prisma.userProfile.update({ where: { id: existing.id }, data })
    : await prisma.userProfile.create({ data });

  const res = NextResponse.json(profile);
  res.cookies.set(PROFILE_COOKIE_NAME, profile.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    // 1 year; this is a simple MVP identity, not security/auth.
    maxAge: 60 * 60 * 24 * 365,
  });

  return res;
}
