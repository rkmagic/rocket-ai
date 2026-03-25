"use client";

import type { Company, Job } from "@prisma/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type JobWithCompany = Job & { company: Company };

function scoreBadgeVariant(score: number | null): "success" | "warning" | "danger" | "muted" {
  if (score == null) return "muted";
  if (score > 80) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

function isNewJob(firstSeenAt: Date | string) {
  const t = new Date(firstSeenAt).getTime();
  return Date.now() - t < 24 * 60 * 60 * 1000;
}

const statusLabels: Record<string, string> = {
  new: "New",
  applied: "Applied",
  rejected: "Rejected",
  interview: "Interview",
  offer: "Offer",
};

export function JobCard({
  job,
  index,
  onOpen,
}: {
  job: JobWithCompany;
  index: number;
  onOpen: (job: JobWithCompany) => void;
}) {
  const score = job.matchScore;
  const ringColor =
    score == null ? "bg-slate-200 text-slate-700" : score > 80 ? "bg-teal-600 text-white" : score >= 50 ? "bg-amber-500 text-white" : "bg-red-500 text-white";

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(job)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(job);
        }
      }}
      className={cn(
        "group relative cursor-pointer border-stone-200/80 bg-white transition-all duration-300 animate-fade-in-up hover:border-teal-600/30 hover:shadow-md",
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <div
        className={cn(
          "absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold shadow-sm ring-2 ring-white",
          ringColor,
        )}
        title={score == null ? "Not scored" : `Match: ${score}`}
      >
        {score ?? "—"}
      </div>
      <CardHeader className="space-y-2 pr-20">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-slate-200 bg-stone-50 text-slate-700">
            {job.company.name}
          </Badge>
          {isNewJob(job.firstSeenAt) && (
            <Badge variant="secondary" className="bg-teal-50 text-teal-800">
              New
            </Badge>
          )}
          <Badge variant={scoreBadgeVariant(score)} className="transition-colors duration-200">
            {statusLabels[job.status] ?? job.status}
          </Badge>
        </div>
        <h3 className="font-heading text-lg font-semibold leading-snug text-slate-900">{job.title}</h3>
        {job.location && <p className="text-sm text-muted-foreground">{job.location}</p>}
      </CardHeader>
      <CardContent>
        <p className="line-clamp-2 text-sm text-slate-600">{job.description.replace(/\s+/g, " ").slice(0, 160)}…</p>
      </CardContent>
    </Card>
  );
}
