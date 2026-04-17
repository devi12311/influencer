export const dynamic = "force-dynamic";

import { auth } from "@/server/auth";
import { getUsageSummary } from "@/server/services/generation";

export default async function UsagePage() {
  const session = await auth();
  const usage = session?.userId ? await getUsageSummary(session.userId) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div>
        <p className="text-sm font-medium text-slate-500">Usage</p>
        <h1 className="text-3xl font-semibold text-slate-950">Generation and publishing activity</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">Generation count</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{usage?.generationCount ?? 0}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">Estimated cost</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">${usage?.estimatedCostUsd.toFixed(3) ?? "0.000"}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">Publish count</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{usage?.publishCount ?? 0}</p>
        </article>
      </div>
    </div>
  );
}
