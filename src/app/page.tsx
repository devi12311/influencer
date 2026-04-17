export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-6 px-6 py-16">
      <span className="w-fit rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700">
        Phase 0 · Foundation
      </span>
      <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
        AI Influencer workspace foundation
      </h1>
      <p className="max-w-2xl text-lg leading-8 text-slate-600">
        The repository is now scaffolded for the blueprint-defined platform: Next.js, Prisma,
        PostgreSQL, Redis, MinIO, worker jobs, and a verified local development workflow.
      </p>
      <ul className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
        <li className="rounded-2xl border border-slate-200 bg-white p-4">Typed environment parsing</li>
        <li className="rounded-2xl border border-slate-200 bg-white p-4">Prisma schema and migration flow</li>
        <li className="rounded-2xl border border-slate-200 bg-white p-4">MinIO and BullMQ scaffolding</li>
        <li className="rounded-2xl border border-slate-200 bg-white p-4">Lint, test, build, and Playwright smoke checks</li>
      </ul>
    </main>
  );
}
