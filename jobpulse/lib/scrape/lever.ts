import axios from "axios";
import * as cheerio from "cheerio";
import type { ScrapedJob } from "@/lib/scrape/types";

type LeverPosting = {
  text?: string;
  hostedUrl: string;
  description?: string;
  descriptionPlain?: string;
  categories?: { location?: string };
};

function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  return $.text().replace(/\s+/g, " ").trim();
}

export async function scrapeLever(slug: string): Promise<ScrapedJob[]> {
  const url = `https://api.lever.co/v0/postings/${slug}`;
  const { data } = await axios.get<LeverPosting[]>(url, {
    timeout: 30000,
    headers: {
      Accept: "application/json",
      "User-Agent": "JobPulse/1.0 (job search assistant)",
    },
  });
  if (!Array.isArray(data)) return [];
  return data.map((p) => {
    const title = (p.text || "Untitled role").trim();
    const plain = p.descriptionPlain?.trim();
    const fromHtml = p.description ? htmlToText(p.description) : "";
    const description = (plain || fromHtml || title).trim();
    return {
      title,
      url: p.hostedUrl,
      location: p.categories?.location?.trim() || null,
      description,
    };
  });
}
