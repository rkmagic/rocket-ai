import type { Job, UserProfile } from "@prisma/client";

type PrefilterResult = {
  score: number; // 0..100-ish
  passes: boolean;
  matchedRoles: string[];
  matchedSkills: string[];
};

export type PrefilterTokens = {
  targetRoles: string[];
  skillTokens: string[];
};

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function splitList(input: string) {
  return input
    .split(/[,;\n]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function unique(arr: string[]) {
  return Array.from(new Set(arr));
}

export function buildPrefilterTokens(profile: UserProfile, opts?: { maxSkillTokens?: number }) {
  const maxSkillTokens = opts?.maxSkillTokens ?? 25;

  const targetRolesRaw = profile.targetRoles ?? "";
  const skillsRaw = profile.skills ?? "";

  const targetRoles = splitList(targetRolesRaw)
    .slice(0, 20)
    .map(normalize);

  const skillTokens = splitList(skillsRaw)
    .slice(0, maxSkillTokens)
    .map((s) => normalize(s).replace(/[^a-z0-9+\- ]/g, ""))
    .filter((s) => s.length >= 3);

  return { targetRoles, skillTokens } satisfies PrefilterTokens;
}

export function prefilterJobWithTokens(
  job: Job,
  tokens: PrefilterTokens,
  opts?: { threshold?: number },
): PrefilterResult {
  const threshold = opts?.threshold ?? 25;
  const jobText = normalize(`${job.title ?? ""} ${job.description ?? ""}`);

  const matchedRoles: string[] = [];
  let score = 0;

  for (const r of tokens.targetRoles) {
    if (!r) continue;
    // Role strings are often multi-word, so do a forgiving match:
    // - direct substring match, OR
    // - at least 2 "role tokens" appearing anywhere in the job text
    if (jobText.includes(r)) {
      matchedRoles.push(r);
      score += 45; // strong signal
      continue;
    }

    const roleTokens = r.split(" ").map((t) => t.trim()).filter((t) => t.length >= 3);
    const overlap = roleTokens.filter((t) => jobText.includes(t)).length;
    if (overlap >= 2) {
      matchedRoles.push(r);
      score += 25; // weaker than direct substring
    }
  }

  const matchedSkills: string[] = [];
  for (const tok of tokens.skillTokens) {
    if (!tok) continue;
    if (jobText.includes(tok)) {
      matchedSkills.push(tok);
      score += 4; // weaker signal than role
    }
  }

  score = Math.min(100, score);
  const passes = score >= threshold || matchedRoles.length > 0; // always allow role matches

  return {
    score,
    passes,
    matchedRoles: unique(matchedRoles),
    matchedSkills: unique(matchedSkills),
  };
}

export function prefilterJob(job: Job, profile: UserProfile, opts?: { threshold?: number; maxSkillTokens?: number }) {
  const tokens = buildPrefilterTokens(profile, { maxSkillTokens: opts?.maxSkillTokens });
  return prefilterJobWithTokens(job, tokens, { threshold: opts?.threshold });
}

