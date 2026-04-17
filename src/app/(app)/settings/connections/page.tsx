export const dynamic = "force-dynamic";

import Link from "next/link";
import { disconnectConnection, forceRefreshConnection, startFacebookConnection, startInstagramConnection, startThreadsConnection } from "@/actions/connection";
import { auth } from "@/server/auth";
import { listConnections } from "@/server/services/social-connection";

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const params = await searchParams;
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

      <section className="flex flex-wrap items-center gap-3 rounded-[2rem] border border-slate-200 bg-white p-6">
        <form action={startInstagramConnection}>
          <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="submit">
            Connect Instagram
          </button>
        </form>
        <form action={startFacebookConnection}>
          <button className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700" type="submit">
            Connect Facebook Page
          </button>
        </form>
        <form action={startThreadsConnection}>
          <button className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700" type="submit">
            Connect Threads
          </button>
        </form>
        {params.connected ? <p className="text-sm text-emerald-600">Connected {params.connected} successfully.</p> : null}
        {params.error ? <p className="text-sm text-red-600">{params.error}</p> : null}
      </section>

      {connections.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-sm leading-7 text-slate-600">
          No social accounts are connected yet. Platform-specific connect buttons arrive one integration at a time.
        </section>
      ) : (
        <section className="space-y-3 rounded-[2rem] border border-slate-200 bg-white p-6">
          {connections.map((connection) => (
            <article key={connection.id} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{connection.platform}</h3>
                  <p className="text-sm text-slate-600">Status: {connection.status}</p>
                  <p className="text-sm text-slate-600">External ID: {connection.externalAccountId}</p>
                  {connection.displayName ? <p className="text-sm text-slate-600">Handle: {connection.displayName}</p> : null}
                </div>
                <div className="flex gap-2">
                  <form
                    action={async () => {
                      "use server";
                      await forceRefreshConnection(connection.id);
                    }}
                  >
                    <button className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700" type="submit">
                      Force refresh
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await disconnectConnection(connection.id);
                    }}
                  >
                    <button className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700" type="submit">
                      Disconnect
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
