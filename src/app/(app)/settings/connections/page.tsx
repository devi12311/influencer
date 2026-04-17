export const dynamic = "force-dynamic";

import Link from "next/link";
import { auth } from "@/server/auth";
import { listConnections } from "@/server/services/social-connection";

export default async function ConnectionsPage() {
  const session = await auth();
  const connections = session?.userId ? await listConnections(session.userId) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Settings</p>
          <h2 className="text-3xl font-semibold text-slate-950">Connections</h2>
        </div>
        <Link className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700" href="/settings">
          Back to security
        </Link>
      </div>

      {connections.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-sm leading-7 text-slate-600">
          No social accounts are connected yet. Platform-specific connect buttons arrive in Phases 4–7.
        </section>
      ) : (
        <section className="space-y-3 rounded-[2rem] border border-slate-200 bg-white p-6">
          {connections.map((connection) => (
            <article key={connection.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">{connection.platform}</h3>
              <p className="text-sm text-slate-600">Status: {connection.status}</p>
              <p className="text-sm text-slate-600">External ID: {connection.externalAccountId}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
