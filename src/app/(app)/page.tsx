import { auth } from "@/server/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-500">Authenticated shell</p>
        <h2 className="text-3xl font-semibold text-slate-950">Welcome back, {session?.user?.name ?? "creator"}.</h2>
        <p className="max-w-2xl text-sm leading-7 text-slate-600">
          Phase 1 establishes credentials auth, protected routes, session revocation, and password management. The next phases will layer on social connections, uploads, and generation workflows.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-semibold text-slate-900">Protected routing</h3>
          <p className="mt-2 text-sm text-slate-600">Unauthenticated visitors are redirected to login with a preserved redirect target.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-semibold text-slate-900">Password security</h3>
          <p className="mt-2 text-sm text-slate-600">Argon2id hashing, strong password rules, and common-password rejection are enforced.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-semibold text-slate-900">Session control</h3>
          <p className="mt-2 text-sm text-slate-600">Session rows back JWT validation so revocation can sign out every device.</p>
        </article>
      </div>
    </section>
  );
}
