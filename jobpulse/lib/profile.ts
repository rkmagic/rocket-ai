import { prisma } from "@/lib/prisma";

/** Single-user MVP: one profile row, earliest created wins. */
export async function getActiveProfile() {
  return prisma.userProfile.findFirst({
    orderBy: { createdAt: "asc" },
  });
}
