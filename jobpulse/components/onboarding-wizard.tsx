"use client";

import * as React from "react";
import type { Company, UserProfile } from "@prisma/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProfileForm } from "@/components/profile-form";

type Resolved = { companies: Array<Company>; unresolved: string[] };

function formatElapsedSeconds(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function OnboardingWizard() {
  const router = useRouter();

  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [step, setStep] = React.useState<1 | 2 | 3>(1);

  const [message, setMessage] = React.useState<string | null>(null);

  const [companyNames, setCompanyNames] = React.useState("");
  const [resolving, setResolving] = React.useState(false);
  const [resolved, setResolved] = React.useState<Resolved | null>(null);

  const [scanning, setScanning] = React.useState(false);
  const [scanLog, setScanLog] = React.useState<string[]>([]);
  const [scanStartedAt, setScanStartedAt] = React.useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [currentCompanyIndex, setCurrentCompanyIndex] = React.useState(0);
  const [scanStage, setScanStage] = React.useState<"scraping" | "matching" | "done" | "error">("scraping");

  const refreshProfile = React.useCallback(async () => {
    const res = await fetch("/api/profile");
    if (!res.ok) return;
    const p = (await res.json()) as UserProfile | null;
    setProfile(p);
  }, []);

  React.useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  // Persist onboarding progress so the user can resume later.
  // This is intentionally stored in localStorage (browser-only) to avoid DB schema changes.
  const ONBOARD_STEP_KEY = "jobpulse_onboard_step";
  const ONBOARD_COMPANY_NAMES_KEY = "jobpulse_onboard_company_names";
  const ONBOARD_ACTIVE_KEY = "jobpulse_onboard_active";

  React.useEffect(() => {
    try {
      const storedStep = Number(localStorage.getItem(ONBOARD_STEP_KEY) ?? "1");
      if (storedStep === 1 || storedStep === 2 || storedStep === 3) setStep(storedStep);
      const storedNames = localStorage.getItem(ONBOARD_COMPANY_NAMES_KEY);
      if (storedNames) setCompanyNames(storedNames);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(ONBOARD_STEP_KEY, String(step));
      localStorage.setItem(ONBOARD_COMPANY_NAMES_KEY, companyNames);
      localStorage.setItem(ONBOARD_ACTIVE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, [step, companyNames]);

  const clearOnboardingProgress = () => {
    try {
      localStorage.removeItem(ONBOARD_STEP_KEY);
      localStorage.removeItem(ONBOARD_COMPANY_NAMES_KEY);
      localStorage.removeItem(ONBOARD_ACTIVE_KEY);
    } catch {
      /* ignore */
    }
  };

  const canContinueToCompanies = Boolean(profile);

  const resolveCompanies = async () => {
    setResolving(true);
    setMessage(null);
    setScanLog([]);
    try {
      const names = companyNames
        .split(/[,;\n]/g)
        .map((s) => s.trim())
        .filter(Boolean);

      if (!names.length) throw new Error("Enter at least one company name.");

      const res = await fetch("/api/companies/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Company resolution failed");
      }

      const data = (await res.json()) as Resolved;
      setResolved(data);
      setStep(3);
      if (data.unresolved.length) {
        setMessage(`Some companies couldn’t be resolved: ${data.unresolved.slice(0, 5).join(", ")}${data.unresolved.length > 5 ? "…" : ""}`);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Resolution failed");
    } finally {
      setResolving(false);
    }
  };

  React.useEffect(() => {
    if (!scanning) return;
    const start = scanStartedAt ?? Date.now();
    const id = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [scanning, scanStartedAt]);

  const scanAndMatch = async () => {
    if (!profile) {
      setMessage("Save your profile first.");
      return;
    }
    if (!resolved?.companies?.length) {
      setMessage("Resolve at least one company first.");
      return;
    }

    setScanning(true);
    setScanStartedAt(Date.now());
    setElapsedSeconds(0);
    setCurrentCompanyIndex(0);
    setScanStage("scraping");
    setMessage(null);
    setScanLog([]);
    try {
      // Separate scraping (admin) from matching (LLM) for a faster, more reliable onboarding.
      const maxMatchesPerCompany = 5;
      const prefilterThreshold = 18;
      const maxSkillTokens = 40;
      const maxJobsToConsider = 2500;
      let totalMatched = 0;

      for (let i = 0; i < resolved.companies.length; i++) {
        const c = resolved.companies[i];
        setCurrentCompanyIndex(i);
        setScanStage("scraping");
        setScanLog((prev) => [...prev, `Scraping ${c.name} (${i + 1}/${resolved.companies.length})...`]);

        const res = await fetch("/api/admin/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId: c.id }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setScanLog((prev) => [...prev, `Failed ${c.name}: ${data.error || `HTTP ${res.status}`}`]);
          continue;
        }

        const scrapeTotalMs = typeof data?.timings?.totalMs === "number" ? data.timings.totalMs : null;
        const scrapeDbMs = typeof data?.timings?.dbMs === "number" ? data.timings.dbMs : null;
        const scrapeScrapeMs = typeof data?.timings?.scrapeMs === "number" ? data.timings.scrapeMs : null;
        setScanLog((prev) => [
          ...prev,
          `Done ${c.name}: created=${data.created ?? 0}${scrapeTotalMs != null ? ` (total ${scrapeTotalMs}ms)` : ""}${
            scrapeDbMs != null ? ` (db ${scrapeDbMs}ms)` : ""
          }${scrapeScrapeMs != null ? ` (scrape ${scrapeScrapeMs}ms)` : ""}`,
        ]);

        // Match only for this one company and hard-cap LLM calls.
        setScanStage("matching");
        setScanLog((prev) => [...prev, `Matching ${c.name} (up to ${maxMatchesPerCompany})...`]);

        const matchRes = await fetch("/api/match-for-companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: profile.id,
            companyIds: [c.id],
            maxLlmMatches: maxMatchesPerCompany,
            prefilterThreshold,
            maxSkillTokens,
            maxJobsToConsider,
          }),
        });

        const matchData = await matchRes.json().catch(() => ({}));
        if (!matchRes.ok) {
          setScanStage("error");
          setScanLog((prev) => [...prev, `Match failed for ${c.name}: ${matchData.error || `HTTP ${matchRes.status}`}`]);
          continue;
        }

        const matchedForCompany = matchData.matched ?? 0;
        totalMatched += matchedForCompany;

        const prefilterMs = typeof matchData?.timings?.prefilterMs === "number" ? matchData.timings.prefilterMs : null;
        const matchMs = typeof matchData?.timings?.matchMs === "number" ? matchData.timings.matchMs : null;
        const matchTotalMs = typeof matchData?.timings?.totalMs === "number" ? matchData.timings.totalMs : null;
        setScanLog((prev) => [
          ...prev,
          `Matched ${matchedForCompany} job(s) for ${c.name}.${matchTotalMs != null ? ` (total ${matchTotalMs}ms)` : ""}${
            prefilterMs != null ? ` (prefilter ${prefilterMs}ms)` : ""
          }${matchMs != null ? ` (updates ${matchMs}ms)` : ""}`,
        ]);
      }
      setScanStage("done");
      setMessage(
        totalMatched > 0
          ? `Search complete. Matched ${totalMatched} job(s). Returning to Dashboard…`
          : "Search complete. No unscored jobs to match. Returning to Dashboard…",
      );
      clearOnboardingProgress();
      setTimeout(() => router.push("/"), 500);
    } catch (e) {
      setScanStage("error");
      setMessage(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
      setScanStartedAt(null);
    }
  };

  const totalCompanies = resolved?.companies?.length ?? 0;
  const currentCompanyName = resolved?.companies?.[currentCompanyIndex]?.name ?? "";
  const progressPercent = totalCompanies
    ? Math.round(((Math.min(currentCompanyIndex, totalCompanies - 1) + 1) / totalCompanies) * 100)
    : 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6 md:p-10">
      <div>
        <h1 className="font-heading text-3xl font-bold text-slate-900">Start Fresh</h1>
        <p className="mt-2 text-sm text-slate-600">
          Save your profile, enter company names, then we’ll scrape only those boards and score roles against your profile.
        </p>
      </div>

      {message && (
        <div
          className={
            message.includes("couldn’t") || message.includes("failed") || message.includes("Error")
              ? "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              : "rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900"
          }
        >
          {message}
        </div>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-700">Step {step} of 3</div>
        </div>

        {step === 1 && (
          <div className="mt-6">
            <ProfileForm
              initial={profile}
              autoRescore={false}
              showRescoreChoice={false}
              onSaved={(p) => setProfile(p)}
            />
            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={() => setStep(2)} disabled={!canContinueToCompanies}>
                Continue to companies
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6">
            <Label htmlFor="companyNames">Company names</Label>
            <Textarea
              id="companyNames"
              className="mt-2"
              rows={6}
              value={companyNames}
              onChange={(e) => setCompanyNames(e.target.value)}
              placeholder="Figma, Stripe, Notion"
            />
              <p className="mt-2 text-xs text-slate-600">
                Tip: Greenhouse boards resolve reliably (example: Stripe, Figma, Notion). Some Lever boards may
                not resolve right now (e.g. Revolut/Wise).
              </p>
            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={resolveCompanies} disabled={resolving}>
                {resolving ? "Resolving…" : "Resolve companies"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6">
            <div className="mb-3 text-sm text-slate-600">
              Resolved companies will be scraped now. Jobs will be pre-filtered before keyword scoring.
            </div>

            {resolved?.companies?.length ? (
              <ul className="mb-4 list-inside list-disc text-sm text-slate-700">
                {resolved.companies.map((c) => (
                  <li key={c.id}>{c.name}</li>
                ))}
              </ul>
            ) : (
              <div className="mb-4 text-sm text-slate-600">No companies resolved yet.</div>
            )}

            {scanning && (
              <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">
                    {scanStage === "scraping"
                      ? `Scraping${currentCompanyName ? ` ${currentCompanyName}` : ""}`
                      : scanStage === "matching"
                        ? `Matching${currentCompanyName ? ` ${currentCompanyName}` : ""}`
                        : scanStage === "error"
                          ? "Encountered an error"
                          : "Done"}
                    {totalCompanies ? ` (${Math.min(currentCompanyIndex, totalCompanies - 1) + 1}/${totalCompanies})` : ""}
                  </div>
                  <div className="shrink-0 text-xs text-teal-700">{formatElapsedSeconds(elapsedSeconds)}</div>
                </div>
                <div className="mt-2 h-2 w-full rounded bg-teal-100">
                  <div
                    className="h-2 rounded bg-teal-600 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {scanLog.length > 0 && (
              <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-slate-700">
                {scanLog.slice(-12).map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)} disabled={scanning}>
                Back
              </Button>
              <Button type="button" onClick={scanAndMatch} disabled={scanning || !resolved?.companies?.length}>
                {scanning ? "Scanning…" : "Search & match jobs"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

