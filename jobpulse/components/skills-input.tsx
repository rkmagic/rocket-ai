"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SkillsInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (csv: string) => void;
  className?: string;
}) {
  const tags = React.useMemo(
    () =>
      value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [value],
  );

  const [draft, setDraft] = React.useState("");

  const commitTags = (next: string[]) => {
    onChange(next.join(", "));
  };

  const addDraft = () => {
    const t = draft.trim();
    if (!t) return;
    const lower = tags.map((x) => x.toLowerCase());
    if (!lower.includes(t.toLowerCase())) {
      commitTags([...tags, t]);
    }
    setDraft("");
  };

  const remove = (tag: string) => {
    commitTags(tags.filter((x) => x !== tag));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-900 ring-1 ring-teal-100"
          >
            {tag}
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-teal-100"
              onClick={() => remove(tag)}
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDraft();
            }
          }}
          placeholder="Type a skill, press Enter"
          className="bg-white"
        />
        <Button type="button" variant="secondary" onClick={addDraft}>
          Add
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Skills are stored as a comma-separated list for matching.</p>
    </div>
  );
}
