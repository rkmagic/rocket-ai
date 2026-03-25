import type { Job, UserProfile } from "@prisma/client";
import { extractTextFromMessage, getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { prisma } from "@/lib/prisma";
import { prefilterJob } from "@/jobpulse/lib/prefilter-job";

export async function runJobMatch(job: Job, profile: UserProfile, opts?: { maxSkillTokens?: number }) {
  // Fast keyword-based scoring (no Anthropic call).
  const pre = prefilterJob(job, profile, { threshold: 0, maxSkillTokens: opts?.maxSkillTokens });
  const score = Math.max(0, Math.min(100, Math.round(pre.score)));

  const reasonParts: string[] = [];
  if (pre.matchedRoles.length) {
    reasonParts.push(`Matched roles: ${pre.matchedRoles.slice(0, 6).join(", ")}`);
  }
  if (pre.matchedSkills.length) {
    reasonParts.push(`Matched skills: ${pre.matchedSkills.slice(0, 10).join(", ")}`);
  }
  if (!reasonParts.length) {
    reasonParts.push("Low keyword overlap with your target roles/skills.");
  }

  const reason = reasonParts.join(". ");

  await prisma.job.update({
    where: { id: job.id },
    data: {
      matchScore: score,
      matchReason: reason,
      profileId: profile.id,
    },
  });

  return { score, reason };
}

export async function runCoverLetter(job: Job, profile: UserProfile) {
  const client = getAnthropicClient();
  const resume = profile.resumeText?.trim() || "(No resume pasted — use profile summary and skills only.)";
  const prompt = `Write a concise, compelling cover letter for this specific role. Use the candidate's real experience from the resume and profile. No generic filler. Maximum 250 words.

Candidate:
- Name: ${profile.name}
- Target roles: ${profile.targetRoles}
- Skills: ${profile.skills}
- Years experience: ${profile.experienceYears}
- Summary: ${profile.experienceSummary}
- Resume / background:
${resume.slice(0, 12000)}

Job:
- Title: ${job.title}
- Company context: see job description
- Description:
${job.description.slice(0, 12000)}

Output only the cover letter text, no subject line or markdown.`;

  const message = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const letter = extractTextFromMessage(message.content).trim();

  await prisma.job.update({
    where: { id: job.id },
    data: { coverLetter: letter, profileId: profile.id },
  });

  return letter;
}
