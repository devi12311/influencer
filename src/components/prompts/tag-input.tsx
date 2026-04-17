"use client";

import { useMemo, useState } from "react";

export function PromptTagInput({ defaultTags = [] }: { defaultTags?: string[] }) {
  const [value, setValue] = useState(defaultTags.join(", "));
  const tags = useMemo(
    () =>
      Array.from(
        new Set(
          value
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ),
    [value],
  );

  return (
    <div className="space-y-3">
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        Tags
        <input
          className="w-full rounded-xl border border-slate-300 px-4 py-3"
          name="tags"
          onChange={(event) => setValue(event.target.value)}
          placeholder="fashion, cinematic, outdoor"
          value={value}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? <p className="text-sm text-slate-500">No tags yet.</p> : null}
        {tags.map((tag) => (
          <span key={tag} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
