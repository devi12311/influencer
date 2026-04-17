export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import { auth } from "@/server/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.userId || session.invalidSession) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
          <div>
            <p className="text-sm font-medium text-slate-500">AI Influencer</p>
            <h1 className="text-lg font-semibold text-slate-950">Workspace</h1>
          </div>
          <UserMenu username={session.user?.name ?? "Creator"} />
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-5">
          <nav className="space-y-2 text-sm text-slate-700">
            <Link className="block rounded-xl px-3 py-2 hover:bg-slate-100" href="/">
              Dashboard
            </Link>
            <Link className="block rounded-xl px-3 py-2 hover:bg-slate-100" href="/influencers/new">
              Uploads
            </Link>
            <Link className="block rounded-xl px-3 py-2 hover:bg-slate-100" href="/settings">
              Settings
            </Link>
            <Link className="block rounded-xl px-3 py-2 hover:bg-slate-100" href="/settings/connections">
              Connections
            </Link>
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
