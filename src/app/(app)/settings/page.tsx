export const dynamic = "force-dynamic";

import { SettingsSecurityForm } from "@/components/auth/settings-security-form";
import { auth } from "@/server/auth";
import { getUsageSummary } from "@/server/services/generation";

export default async function SettingsPage() {
  const session = await auth();
  const usage = session?.userId ? await getUsageSummary(session.userId) : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Account settings</p>
        <h2 className="text-3xl font-semibold text-slate-950">Security</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">Generation count</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{usage?.generationCount ?? 0}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">Estimated generation cost</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">${usage?.estimatedCostUsd.toFixed(3) ?? "0.000"}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">Published posts</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{usage?.publishCount ?? 0}</p>
        </article>
      </div>
      <div className="flex justify-end">
        <a className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700" href="/settings/connections">
          View connections
        </a>
      </div>
      <SettingsSecurityForm />
    </div>
  );
}
