"use client";

import * as React from "react";
import type { UserProfile } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SkillsInput } from "@/components/skills-input";

export function ProfileForm({
  initial,
  autoRescore = true,
  showRescoreChoice = false,
}: {
  initial: UserProfile | null;
  autoRescore?: boolean;
  showRescoreChoice?: boolean;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [email, setEmail] = React.useState(initial?.email ?? "");
  const [targetRoles, setTargetRoles] = React.useState(initial?.targetRoles ?? "");
  const [skills, setSkills] = React.useState(initial?.skills ?? "");
  const [experienceYears, setExperienceYears] = React.useState(initial?.experienceYears ?? 0);
  const [experienceSummary, setExperienceSummary] = React.useState(initial?.experienceSummary ?? "");
  const [resumeText, setResumeText] = React.useState(initial?.resumeText ?? "");
  const [saving, setSaving] = React.useState(false);
  const [rescoring, setRescoring] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [updateDashboard, setUpdateDashboard] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          targetRoles,
          skills,
          experienceYears: Number(experienceYears),
          experienceSummary,
          resumeText: resumeText || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      const doRescore = showRescoreChoice ? updateDashboard : autoRescore;
      if (doRescore) {
        setRescoring(true);
        setMessage("Profile saved. Updating match scores with your new profile...");

        const matchRes = await fetch("/api/match-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: data.id }),
        });

        if (!matchRes.ok) {
          const matchErr = await matchRes.json().catch(() => ({}));
          throw new Error(matchErr.error || "Match rescoring failed");
        }

        const matchData = (await matchRes.json()) as { matched?: number; totalJobs?: number };
        const total = matchData.totalJobs ?? 0;
        const matched = matchData.matched ?? 0;

        setMessage(
          total > 0
            ? `Profile saved. Match scores updated for ${matched}/${total} job(s).`
            : "Profile saved. No jobs found to rescore."
        );
      } else {
        setMessage(showRescoreChoice ? "Profile saved. Dashboard left unchanged." : "Profile saved.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
      setRescoring(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
      <div>
        <h1 className="font-heading text-3xl font-bold text-slate-900">Your profile</h1>
        <p className="mt-2 text-sm text-slate-600">
          This powers match scores and cover letters. Honest detail beats buzzwords—help the AI advocate for the real you.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="bg-white" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetRoles">Target role titles</Label>
        <Input
          id="targetRoles"
          value={targetRoles}
          onChange={(e) => setTargetRoles(e.target.value)}
          placeholder="Product Manager, Program Manager, TPM"
          required
          className="bg-white"
        />
        <p className="text-xs text-muted-foreground">Comma-separated list of titles you want.</p>
      </div>

      <div className="space-y-2">
        <Label>Skills</Label>
        <SkillsInput value={skills} onChange={setSkills} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="experienceYears">Years of experience</Label>
        <Input
          id="experienceYears"
          type="number"
          min={0}
          value={experienceYears}
          onChange={(e) => setExperienceYears(Number(e.target.value))}
          required
          className="bg-white"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="experienceSummary">Experience summary</Label>
        <Textarea
          id="experienceSummary"
          value={experienceSummary}
          onChange={(e) => setExperienceSummary(e.target.value)}
          required
          rows={4}
          placeholder="2–3 sentences on your background and strengths."
          className="bg-white"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="resumeText">Resume (paste)</Label>
        <Textarea
          id="resumeText"
          value={resumeText ?? ""}
          onChange={(e) => setResumeText(e.target.value)}
          rows={8}
          placeholder="Paste plain text from your resume for richer cover letters."
          className="bg-white"
        />
      </div>

      {message && (
        <p className={`text-sm ${message.includes("saved") ? "text-teal-700" : "text-red-600"}`}>{message}</p>
      )}

      {showRescoreChoice && (
        <div className="flex items-center justify-start gap-2">
          <input
            id="updateDashboard"
            type="checkbox"
            className="h-4 w-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
            checked={updateDashboard}
            onChange={(e) => setUpdateDashboard(e.target.checked)}
          />
          <Label htmlFor="updateDashboard" className="cursor-pointer text-sm text-slate-700">
            Update dashboard match scores now
          </Label>
        </div>
      )}

      <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={saving || rescoring}>
        {(saving || rescoring) && <Loader2 className="animate-spin" />}
        {rescoring ? "Updating matches..." : "Save profile"}
      </Button>
    </form>
  );
}
