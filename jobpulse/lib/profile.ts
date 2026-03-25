import { prisma } from "@/lib/prisma";

import { cookies } from "next/headers";

export const PROFILE_COOKIE_NAME = "jobpulse_profile_id";

/**
 * Anonymous MVP profile selection:
 * - If the browser has `jobpulse_profile_id` cookie, use that profile.
 * - Otherwise return `null` so a fresh/incognito browser triggers onboarding.
 */
export async function getActiveProfile() {
  const profileId = cookies().get(PROFILE_COOKIE_NAME)?.value;
  if (!profileId) return null;

  return prisma.userProfile.findUnique({ where: { id: profileId } });
}
