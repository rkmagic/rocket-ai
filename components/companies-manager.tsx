"use client";

import * as React from "react";
import Link from "next/link";
import type { Company } from "@prisma/client";
import { Loader2, Trash2, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CompaniesManager({ initial }: { initial: Company[] }) {
  const [companies, setCompanies] = React.useState(initial);
  const [name, setName] = React.useState("");
  const [careersUrl, setCareersUrl] = React.useState("");
  const [platform, setPlatform] = React.useState("greenhouse");
  const [slug, setSlug] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [scanningId, setScanningId] = React.useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = React.useState<{ kind: "ok" | "err"; message: string } | null>(null);

  const reload = async () => {
    const res = await fetch("/api/companies");
    if (res.ok) setCompanies(await res.json());
  };

  const addCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, careersUrl, platform, slug: slug || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to add");
        return;
      }
      setName("");
      setCareersUrl("");
      setSlug("");
      setPlatform("greenhouse");
      await reload();
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this company and its tracked jobs from JobPulse?")) return;
    const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
    if (res.ok) setCompanies((c) => c.filter((x) => x.id !== id));
  };

  const scan = async (id: string) => {
    setScanningId(id);
    setScanFeedback(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: id }),
      });
      let data: { error?: string; created?: number; matched?: number; totalScraped?: number } = {};
      try {
        data = await res.json();
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        setScanFeedback({
          kind: "err",
          message: data.error || `Scan failed (HTTP ${res.status}). Check the network tab or server logs.`,
        });
        return;
      }
      const created = data.created ?? 0;
      const matched = data.matched ?? 0;
      const total = data.totalScraped ?? 0;
      setScanFeedback({
        kind: "ok",
        message:
          created > 0
            ? `Found ${total} posting(s) on the board; ${created} new job(s) saved, ${matched} matched to your profile. Open Dashboard to see them.`
            : total > 0
              ? `Found ${total} posting(s); no new jobs (already in your database). View them on Dashboard.`
              : `No postings returned for this board. The slug or API may have changed.`,
      });
    } catch (e) {
      setScanFeedback({
        kind: "err",
        message: e instanceof Error ? e.message : "Network error while scanning.",
      });
    } finally {
      setScanningId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-10 p-6 md:p-10">
      <div>
        <h1 className="font-heading text-3xl font-bold text-slate-900">Companies</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage which career sites we scrape. <strong>Job listings live on the Dashboard</strong> — use{" "}
          <Link href="/" className="font-medium text-teal-700 underline-offset-2 hover:underline">
            Dashboard
          </Link>{" "}
          after scanning. We seeded popular Greenhouse and Lever boards; click Scan now to pull roles (save your{" "}
          <Link href="/profile" className="font-medium text-teal-700 underline-offset-2 hover:underline">
            Profile
          </Link>{" "}
          first for AI match scores).
        </p>
      </div>

      {scanFeedback && (
        <div
          role="status"
          className={
            scanFeedback.kind === "ok"
              ? "rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900"
              : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          }
        >
          {scanFeedback.message}
        </div>
      )}

      <Card className="border-stone-200 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Add company</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={addCompany}>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cname">Company name</Label>
              <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} required className="bg-white" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="curl">Careers URL</Label>
              <Input
                id="curl"
                value={careersUrl}
                onChange={(e) => setCareersUrl(e.target.value)}
                required
                placeholder="https://boards.greenhouse.io/acme"
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="greenhouse">Greenhouse</SelectItem>
                  <SelectItem value="lever">Lever</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cslug">Board slug</Label>
              <Input
                id="cslug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. stripe (required for Greenhouse/Lever)"
                className="bg-white"
              />
              <p className="text-xs text-muted-foreground">For custom sites, slug can be a short label; scraping uses the careers URL.</p>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={adding}>
                {adding && <Loader2 className="animate-spin" />}
                Add company
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {companies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-8 py-12 text-center text-sm text-slate-600">
          No companies yet. Run <code className="rounded bg-stone-100 px-1">npx prisma db seed</code> or add one above.
        </div>
      ) : (
        <ul className="space-y-3">
          {companies.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-heading font-semibold text-slate-900">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.careersUrl}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{c.platform}</Badge>
                  <Badge variant="secondary">slug: {c.slug}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={scanningId === c.id}
                  onClick={() => scan(c.id)}
                >
                  {scanningId === c.id ? <Loader2 className="animate-spin" /> : <Radar className="h-4 w-4" />}
                  Scan now
                </Button>
                <Button type="button" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => remove(c.id)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
