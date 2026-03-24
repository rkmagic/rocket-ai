"use client";

import * as React from "react";
import Link from "next/link";
import type { UserProfile } from "@prisma/client";
import { Loader2, Sparkles } from "lucide-react";
import { useJobFilters } from "@/components/job-filter-context";
import { JobCard, type JobWithCompany } from "@/components/job-card";
import { JobDetailSheet } from "@/components/job-detail-sheet";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function JobCardSkeleton() {
  return (
    <Card className="border-stone-200/80">
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-12 w-full" />
      </CardContent>
    </Card>
  );
}

export function DashboardClient() {
  const { selectedCompanyIds, clearCompanies } = useJobFilters();
  const [jobs, setJobs] = React.useState<JobWithCompany[]>([]);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [companies, setCompanies] = React.useState<{ id: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [scanning, setScanning] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [minScore, setMinScore] = React.useState<string>("");
  const [selectedJob, setSelectedJob] = React.useState<JobWithCompany | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [scanFeedback, setScanFeedback] = React.useState<{ kind: "ok" | "err"; message: string } | null>(null);

  const loadJobs = React.useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedCompanyIds.length) params.set("companyIds", selectedCompanyIds.join(","));
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (minScore.trim() !== "") params.set("minScore", minScore.trim());
    const res = await fetch(`/api/jobs?${params.toString()}`);
    if (!res.ok) return;
    const data = (await res.json()) as JobWithCompany[];
    setJobs(data);
  }, [selectedCompanyIds, statusFilter, minScore]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const [pRes, cRes] = await Promise.all([fetch("/api/profile"), fetch("/api/companies")]);
      if (!cancelled) {
        if (pRes.ok) setProfile(await pRes.json());
        if (cRes.ok) setCompanies(await cRes.json());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadJobs();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadJobs]);

  const scanAll = async () => {
    if (!companies.length) return;
    setScanning(true);
    setScanFeedback(null);
    let totalCreated = 0;
    let totalMatched = 0;
    const errors: string[] = [];
    try {
      for (const c of companies) {
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId: c.id }),
        });
        let data: { error?: string; created?: number; matched?: number } = {};
        try {
          data = await res.json();
        } catch {
          /* ignore */
        }
        if (!res.ok) {
          errors.push(data.error || `Company scan failed (${res.status})`);
          continue;
        }
        totalCreated += data.created ?? 0;
        totalMatched += data.matched ?? 0;
      }
      await loadJobs();
      if (errors.length) {
        setScanFeedback({
          kind: "err",
          message: `Some scans failed: ${errors.slice(0, 3).join(" · ")}${errors.length > 3 ? " …" : ""}`,
        });
      } else {
        setScanFeedback({
          kind: "ok",
          message:
            totalCreated > 0
              ? `Imported ${totalCreated} new job(s); ${totalMatched} matched to your profile (if saved). Scroll down to browse.`
              : `Boards are up to date — no new postings since last scan. You should still see existing jobs below (try clearing sidebar filters or minimum score).`,
        });
      }
    } catch (e) {
      setScanFeedback({
        kind: "err",
        message: e instanceof Error ? e.message : "Scan failed unexpectedly.",
      });
    } finally {
      setScanning(false);
    }
  };

  const openJob = (job: JobWithCompany) => {
    setSelectedJob(job);
    setSheetOpen(true);
  };

  const onJobUpdated = (updated: JobWithCompany) => {
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    setSelectedJob((j) => (j?.id === updated.id ? updated : j));
  };

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">Your matches</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Roles pulled from the companies you track, ranked by how well they fit your profile. Take it one card at a
              time.
            </p>
          </div>
          <Button
            type="button"
            className="shrink-0 bg-teal-600 hover:bg-teal-700"
            disabled={scanning || !companies.length}
            onClick={scanAll}
          >
            {scanning ? <Loader2 className="animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Scan all companies
          </Button>
        </header>

        {scanFeedback && (
          <div
            role="status"
            className={
              scanFeedback.kind === "ok"
                ? "rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900"
                : "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            }
          >
            {scanFeedback.message}
          </div>
        )}

        <div className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm md:flex-row md:items-end md:justify-between">
          <div className="grid flex-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minScore">Minimum match score</Label>
              <Input
                id="minScore"
                type="number"
                min={0}
                max={100}
                placeholder="e.g. 50"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Company filter</Label>
              <p className="text-sm text-muted-foreground">
                {selectedCompanyIds.length === 0
                  ? "Showing all companies (use the sidebar to narrow down)."
                  : `${selectedCompanyIds.length} compan${selectedCompanyIds.length === 1 ? "y" : "ies"} selected in the sidebar.`}
              </p>
            </div>
          </div>
        </div>

        {loading || scanning ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-8 py-16 text-center">
            <p className="font-heading text-xl font-semibold text-slate-900">No jobs found yet</p>
            <p className="mt-2 max-w-md text-sm text-slate-600">
              Click <strong>Scan all companies</strong> above (or scan one at a time on Companies). Jobs load from
              Greenhouse/Lever into this list. If you use <strong>Minimum match score</strong> or sidebar company filters,
              loosen them to see more roles.
            </p>
            {(selectedCompanyIds.length > 0 || minScore.trim() !== "") && (
              <Button type="button" variant="secondary" className="mt-4" onClick={() => { clearCompanies(); setMinScore(""); }}>
                Clear company filters and minimum score
              </Button>
            )}
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                type="button"
                className="bg-teal-600 hover:bg-teal-700"
                disabled={scanning || !companies.length}
                onClick={scanAll}
              >
                {scanning ? <Loader2 className="animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Scan all companies
              </Button>
              <Button asChild variant="outline" className="border-teal-600 text-teal-700 hover:bg-teal-50">
                <Link href="/companies">Manage companies</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job, i) => (
              <JobCard key={job.id} job={job} index={i} onOpen={openJob} />
            ))}
          </div>
        )}
      </div>

      <JobDetailSheet
        job={selectedJob}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        profile={profile}
        onJobUpdated={onJobUpdated}
      />
    </div>
  );
}
