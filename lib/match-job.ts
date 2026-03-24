import type { Job, UserProfile } from "@prisma/client";
import { extractTextFromMessage, getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { parseJsonObject } from "@/lib/parse-json-response";
import { prisma } from "@/lib/prisma";

export async function runJobMatch(job: Job, profile: UserProfile) {
  const client = getAnthropicClient();
  const prompt = `You are a career coach. Score this job 0-100 for how well it matches this candidate. Return JSON only with keys "score" (number) and "reason" (string). Consider role fit, skill overlap, experience level, and location.

Candidate:
- Name: ${profile.name}
- Target roles: ${profile.targetRoles}
- Skills: ${profile.skills}
- Years experience: ${profile.experienceYears}
- Summary: ${profile.experienceSummary}

Job:
- Title: ${job.title}
- Location: ${job.location ?? "Not specified"}
- Description:
${job.description.slice(0, 12000)}`;

  const message = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = extractTextFromMessage(message.content);
  const parsed = parseJsonObject<{ score: number; reason: string }>(text);
  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score))));
  const reason = String(parsed.reason ?? "").trim();

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
