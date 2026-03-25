"use client";

import { cn } from "@/lib/utils";

export function MatchScoreRing({ score, className }: { score: number | null; className?: string }) {
  const s = score ?? 0;
  const pct = Math.max(0, Math.min(100, s));
  const radius = 36;
  const stroke = 6;
  const normalized = 2 * Math.PI * radius;
  const offset = normalized - (pct / 100) * normalized;

  const strokeColor =
    score == null ? "#94a3b8" : score > 80 ? "#0d9488" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#e7e5e4" strokeWidth={stroke} />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={normalized}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-2xl font-bold text-slate-900">{score == null ? "—" : score}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">match</span>
      </div>
    </div>
  );
}
