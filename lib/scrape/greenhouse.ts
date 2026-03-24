import axios from "axios";
import * as cheerio from "cheerio";
import type { ScrapedJob } from "@/lib/scrape/types";

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  content?: string;
  location?: { name?: string } | null;
};

type GreenhouseResponse = {
  jobs?: GreenhouseJob[];
};

/** Job Board API returns escaped HTML in JSON (e.g. &lt;h2&gt;). */
function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  return $.text().replace(/\s+/g, " ").trim();
}

const JSON_HEADERS = {
  Accept: "application/json",
  "User-Agent": "JobPulse/1.0 (job search assistant; +https://github.com)",
};

/**
 * Public Job Board API (JSON). The legacy URL boards.greenhouse.io/{slug}/jobs
 * often returns HTML now, so we use the supported boards-api host.
 * @see https://developer.greenhouse.io/job-board.html
 */
export async function scrapeGreenhouse(slug: string): Promise<ScrapedJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`;
  const { data } = await axios.get<GreenhouseResponse>(url, {
    timeout: 30000,
    headers: JSON_HEADERS,
    validateStatus: (s) => s < 500,
  });

  if (!data || typeof data !== "object" || !Array.isArray(data.jobs)) {
    throw new Error(`Greenhouse board "${slug}" returned an unexpected response (is the slug correct?)`);
  }

  const jobs = data.jobs;
  return jobs.map((j) => {
    const raw = j.content ? decodeHtmlEntities(j.content) : "";
    const description = raw ? htmlToText(raw) : "";
    return {
      title: j.title,
      url: j.absolute_url,
      location: j.location?.name?.trim() || null,
      description: description || j.title,
    };
  });
}
