import axios from "axios";

export type ResolvedCompany =
  | {
      name: string;
      platform: "greenhouse";
      slug: string;
      careersUrl: string;
    }
  | {
      name: string;
      platform: "lever";
      slug: string;
      careersUrl: string;
    };

function normalizeName(name: string) {
  return name.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

function slugCandidates(companyName: string): string[] {
  const base = normalizeName(companyName);
  const words = base.split(" ").filter(Boolean);
  if (!words.length) return [];

  const noDelim = words.join("");
  const hyphen = words.join("-");

  // Try the most likely variants first.
  return Array.from(new Set([noDelim, hyphen, words[0], words.join("")]));
}

async function tryGreenhouse(slug: string): Promise<boolean> {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=false`;
    const res = await axios.get(url, {
      timeout: 12000,
      headers: { Accept: "application/json", "User-Agent": "JobPulse/1.0" },
      validateStatus: (s) => s < 500,
    });
    // If the slug is valid, response is an object with "jobs" array (even if empty).
    return Boolean(res.data && typeof res.data === "object" && Array.isArray(res.data.jobs));
  } catch {
    return false;
  }
}

async function tryLever(slug: string): Promise<boolean> {
  try {
    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}`;
    const res = await axios.get(url, {
      timeout: 12000,
      headers: { Accept: "application/json", "User-Agent": "JobPulse/1.0" },
      validateStatus: (s) => s < 500,
    });
    return Array.isArray(res.data);
  } catch {
    return false;
  }
}

export async function resolveCompanyByName(companyName: string): Promise<ResolvedCompany | null> {
  const candidates = slugCandidates(companyName);
  for (const slug of candidates) {
    if (!slug) continue;
    const ok = await tryGreenhouse(slug);
    if (ok) {
      return {
        name: companyName,
        platform: "greenhouse",
        slug,
        careersUrl: `https://boards.greenhouse.io/${slug}`,
      };
    }
  }

  for (const slug of candidates) {
    if (!slug) continue;
    const ok = await tryLever(slug);
    if (ok) {
      return {
        name: companyName,
        platform: "lever",
        slug,
        careersUrl: `https://jobs.lever.co/${slug}`,
      };
    }
  }

  return null;
}

