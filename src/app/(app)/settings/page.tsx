export const dynamic = "force-dynamic";

import Link from "next/link";
import { SettingsSecurityForm } from "@/components/auth/settings-security-form";
import { TimezoneForm } from "@/components/settings/timezone-form";
import { auth } from "@/server/auth";
import { getUsageSummary } from "@/server/services/generation";
import { db } from "@/server/db";

export default async function SettingsPage() {
  const session = await auth();
  const [usage, user] = session?.userId
    ? await Promise.all([getUsageSummary(session.userId), db.user.findUnique({ where: { id: session.userId } })])
    : [null, null];

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
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <TimezoneForm defaultTimezone={user?.timezone ?? null} />
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">Usage</p>
          <h2 className="text-xl font-semibold text-slate-950">Observability shortcuts</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" href="/settings/connections">
              View connections
            </Link>
            <Link className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" href="/usage">
              Open usage page
            </Link>
            <Link className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" href="/healthz">
              Health check
            </Link>
          </div>
        </section>
      </div>
      <SettingsSecurityForm />
    </div>
  );
}
