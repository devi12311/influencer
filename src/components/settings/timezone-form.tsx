"use client";

import { useEffect, useState } from "react";
import { updateUserTimezoneAction } from "@/actions/settings";

export function TimezoneForm({ defaultTimezone }: { defaultTimezone?: string | null }) {
  const [timezone, setTimezone] = useState(defaultTimezone ?? "UTC");

  useEffect(() => {
    if (defaultTimezone) return;
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch {
      setTimezone("UTC");
    }
  }, [defaultTimezone]);

  return (
    <form action={updateUserTimezoneAction} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Timezone</p>
        <h2 className="text-xl font-semibold text-slate-950">Display scheduling in your local timezone</h2>
      </div>
      <input className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" name="timezone" onChange={(event) => setTimezone(event.target.value)} value={timezone} />
      <button className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700" type="submit">
        Save timezone
      </button>
    </form>
  );
}
