"use client";

import * as React from "react";
import type { UserProfile } from "@prisma/client";
import { ExternalLink, Loader2, Copy, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MatchScoreRing } from "@/components/match-score-ring";
import type { JobWithCompany } from "@/components/job-card";

const STATUSES = [
  { value: "new", label: "New" },
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "rejected", label: "Rejected" },
  { value: "offer", label: "Offer" },
];

export function JobDetailSheet({
  job,
  open,
  onOpenChange,
  profile,
  onJobUpdated,
}: {
  job: JobWithCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile | null;
  onJobUpdated: (job: JobWithCompany) => void;
}) {
  const [local, setLocal] = React.useState<JobWithCompany | null>(job);
  const [coverLoading, setCoverLoading] = React.useState(false);
  const [coverError, setCoverError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setLocal(job);
    setCoverError(null);
    setCopied(false);
  }, [job]);

  const handleStatus = async (status: string) => {
    if (!local) return;
    const res = await fetch(`/api/jobs/${local.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    const updated = (await res.json()) as JobWithCompany;
    setLocal(updated);
    onJobUpdated(updated);
  };

  const handleCoverLetter = async () => {
    if (!local || !profile) return;
    setCoverLoading(true);
    setCoverError(null);
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: local.id, profileId: profile.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      const letter = data.coverLetter as string;
      setLocal((j) => (j ? { ...j, coverLetter: letter } : j));
      onJobUpdated({ ...local, coverLetter: letter });
    } catch (e) {
      setCoverError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setCoverLoading(false);
    }
  };

  const copyLetter = async () => {
    if (!local?.coverLetter) return;
    await navigator.clipboard.writeText(local.coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!local) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="space-y-2 text-left">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700">{local.company.name}</p>
          <SheetTitle className="text-2xl leading-tight">{local.title}</SheetTitle>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {local.location && <span>{local.location}</span>}
            <span>
              First seen{" "}
              {new Date(local.firstSeenAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </SheetHeader>

        <div className="mt-4 flex flex-col items-center gap-2">
          <MatchScoreRing score={local.matchScore} />
          {local.matchReason ? (
            <p className="text-center text-sm leading-relaxed text-slate-700">{local.matchReason}</p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">Run a scan with your profile saved to see AI match scores.</p>
          )}
        </div>

        <Separator className="my-4" />

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-slate-900">Description</p>
          <ScrollArea className="h-48 rounded-md border border-stone-200 bg-white p-3">
            <p className="whitespace-pre-wrap text-sm text-slate-700">{local.description}</p>
          </ScrollArea>
        </div>

        <Separator className="my-4" />

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="bg-teal-600 hover:bg-teal-700"
              disabled={!profile || coverLoading}
              onClick={handleCoverLetter}
            >
              {coverLoading && <Loader2 className="animate-spin" />}
              Generate cover letter
            </Button>
            {local.coverLetter && (
              <Button type="button" variant="outline" size="icon" onClick={copyLetter} title="Copy">
                {copied ? <Check className="text-teal-600" /> : <Copy />}
              </Button>
            )}
            <Button variant="outline" asChild>
              <a href={local.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                Open original
              </a>
            </Button>
          </div>
          {!profile && <p className="text-xs text-amber-700">Save your profile first to generate cover letters.</p>}
          {coverError && <p className="text-xs text-red-600">{coverError}</p>}
          {local.coverLetter && (
            <ScrollArea className="max-h-48 rounded-md border border-stone-200 bg-stone-50 p-3">
              <p className="whitespace-pre-wrap text-sm text-slate-800">{local.coverLetter}</p>
            </ScrollArea>
          )}
        </div>

        <Separator className="my-4" />

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-slate-900">Status</p>
          <Select value={local.status} onValueChange={handleStatus}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SheetContent>
    </Sheet>
  );
}
