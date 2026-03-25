"use client";

import * as React from "react";
import type { Company } from "@prisma/client";
import { Loader2, Radar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ScanLogLine = { kind: "ok" | "err"; message: string };

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

export function AdminCompaniesManager() {
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const [names, setNames] = React.useState("");
  const [resolving, setResolving] = React.useState(false);

  const [scraping, setScraping] = React.useState(false);
  const [scanLog, setScanLog] = React.useState<ScanLogLine[]>([]);
  const [message, setMessage] = React.useState<string | null>(null);

  const loadCompanies = React.useCallback(async () => {
    const res = await fetch("/api/companies");
    if (!res.ok) return;
    const data = (await res.json()) as Company[];
    setCompanies(data);
    setSelectedIds((prev) => prev.filter((id) => data.some((c) => c.id === id)));
  }, []);

  React.useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : uniq([...prev, id])));
  };

  const addByNames = async () => {
    setResolving(true);
    setMessage(null);
    setScanLog([]);
    try {
      const parsed = names
        .split(/[,;\n]/g)
        .map((s) => s.trim())
        .filter(Boolean);

      if (!parsed.length) throw new Error("Enter at least one company name.");

      const res = await fetch("/api/companies/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: parsed }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Resolve failed");

      const unresolved = Array.isArray(data.unresolved) ? data.unresolved : [];
      await loadCompanies();

      if (unresolved.length) {
        setMessage(
          `Resolved some companies. Unresolved: ${unresolved.slice(0, 6).join(", ")}${
            unresolved.length > 6 ? "…" : ""
          }`
        );
      } else {
        setMessage("Companies added.");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to resolve companies");
    } finally {
      setResolving(false);
    }
  };

  const scrapeSelected = async () => {
    if (!selectedIds.length) {
      setMessage("Select at least one company.");
      return;
    }

    setScraping(true);
    setMessage(null);
    setScanLog([]);
    try {
      for (const id of selectedIds) {
        setScanLog((prev) => [...prev, { kind: "ok", message: `Scraping company ${id}…` }]);
        const res = await fetch("/api/admin/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId: id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setScanLog((prev) => [...prev, { kind: "err", message: `Failed ${id}: ${data.error || res.status}` }]);
          continue;
        }
        setScanLog((prev) => [
          ...prev,
          { kind: "ok", message: `Done ${id}: created=${data.created ?? 0}, totalScraped=${data.totalScraped ?? data.totalScraped}` },
        ]);
      }

      await loadCompanies();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Scrape failed");
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Admin</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Add companies by name (auto-resolve platform + slug), then scrape job boards in the background.
            This does <strong>not</strong> run AI matching; users run matching from their onboarding flow.
          </p>
        </div>

        <Card className="border-stone-200 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Add companies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyNames">Company names</Label>
              <Textarea
                id="companyNames"
                rows={4}
                value={names}
                onChange={(e) => setNames(e.target.value)}
                placeholder="Figma, Stripe, Notion"
              />
              <p className="text-xs text-slate-600">
                Tip: Greenhouse boards resolve reliably (example: Stripe, Figma, Notion). Some Lever boards may
                not resolve right now (e.g. Revolut/Wise).
              </p>
            </div>
            <Button type="button" className="bg-teal-600 hover:bg-teal-700" onClick={addByNames} disabled={resolving}>
              {resolving && <Loader2 className="animate-spin" />}
              {resolving ? "Resolving…" : "Resolve & add"}
            </Button>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="button" className="bg-teal-600 hover:bg-teal-700" onClick={scrapeSelected} disabled={scraping || !companies.length}>
            {scraping && <Loader2 className="animate-spin" />}
            {scraping ? "Scraping…" : "Scrape selected"}
          </Button>
          {message && <div className="text-sm text-slate-700">{message}</div>}
        </div>

        <Card className="border-stone-200 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Companies</CardTitle>
          </CardHeader>
          <CardContent>
            {companies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-8 py-12 text-sm text-slate-600 text-center">
                No companies yet. Add some above.
              </div>
            ) : (
              <div className="space-y-3">
                {companies.map((c) => {
                  const checked = selectedIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelected(c.id)}
                          className="mt-1 h-4 w-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                          <p className="font-heading font-semibold text-slate-900">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.careersUrl}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="outline">{c.platform}</Badge>
                            <Badge variant="secondary">slug: {c.slug}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={scraping}
                          onClick={() => {
                            setSelectedIds([c.id]);
                            scrapeSelected();
                          }}
                        >
                          <Radar className="h-4 w-4" />
                          Scrape
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {scanLog.length > 0 && (
          <Card className="border-stone-200 shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Scrape log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {scanLog.map((l, idx) => (
                  <div key={idx} className={l.kind === "err" ? "text-red-700" : "text-slate-700"}>
                    {l.message}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

