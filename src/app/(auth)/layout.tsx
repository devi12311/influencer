export const dynamic = "force-dynamic";

import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16 sm:px-10">
      <div className="grid gap-10 rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-12">
        <section className="space-y-4">
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
            AI Influencer
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Credentials-based access for your workspace.</h1>
          <p className="max-w-xl text-base leading-7 text-slate-600">
            Sign up with a strong password, then manage influencer assets, prompts, and publishing workflows inside the protected app shell.
          </p>
          <ul className="space-y-3 text-sm text-slate-600">
            <li>• Password policy enforcement with common-password blocking</li>
            <li>• Redis-backed failed login throttling</li>
            <li>• Session revocation across devices</li>
          </ul>
        </section>
        <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 sm:p-8">{children}</section>
      </div>
    </main>
  );
}
