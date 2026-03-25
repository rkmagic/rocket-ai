import axios from "axios";
import * as cheerio from "cheerio";
import type { ScrapedJob } from "@/lib/scrape/types";

/**
 * Best-effort parsing for arbitrary careers pages: headings + nearby links.
 */
export async function scrapeCustom(careersUrl: string): Promise<ScrapedJob[]> {
  const { data: html } = await axios.get<string>(careersUrl, {
    timeout: 30000,
    headers: { "User-Agent": "JobPulse/1.0 (job search assistant)" },
    maxRedirects: 5,
  });
  const $ = cheerio.load(html);
  const base = new URL(careersUrl);
  const seen = new Set<string>();
  const out: ScrapedJob[] = [];

  $("h2, h3").each((_, el) => {
    const heading = $(el).text().trim();
    if (!heading || heading.length < 3) return;

    const container = $(el).parent().length ? $(el).parent() : $(el);
    let link = $(el).find("a[href]").first();
    if (!link.length) {
      link = container.find("a[href]").first();
    }
    if (!link.length) {
      link = $(el).nextAll("a[href]").first();
    }
    const href = link.attr("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

    let absolute: string;
    try {
      absolute = new URL(href, base).href;
    } catch {
      return;
    }
    if (seen.has(absolute)) return;
    seen.add(absolute);

    let location: string | null = null;
    const locMatch = container.text().match(
      /(?:Remote|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}|[A-Z][a-z]+\s*\/\s*[A-Z][a-z]+)/,
    );
    if (locMatch) location = locMatch[0].trim();

    out.push({
      title: heading.slice(0, 200),
      url: absolute,
      location,
      description: `${heading}\n\n${container.text().replace(/\s+/g, " ").trim().slice(0, 4000)}`,
    });
  });

  return out;
}
