export const dynamic = "force-dynamic";

import { GenerationLauncher } from "@/components/generation/generation-launcher";
import { auth } from "@/server/auth";
import { listInfluencersByUser } from "@/server/services/influencer";
import { listPromptsByUser } from "@/server/services/prompt";

export default async function DashboardPage() {
  const session = await auth();
  const influencers = session?.userId ? await listInfluencersByUser(session.userId) : [];
  const prompts = session?.userId ? await listPromptsByUser({ userId: session.userId }) : [];

  return (
    <section className="space-y-6">
      <div className="space-y-2 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Authenticated shell</p>
        <h2 className="text-3xl font-semibold text-slate-950">Welcome back, {session?.user?.name ?? "creator"}.</h2>
        <p className="max-w-2xl text-sm leading-7 text-slate-600">
          The workspace now has the prerequisites for generation: influencers, prompts, upload pipeline, and social providers. Use the sandbox below to kick off a generation job and preview the output.
        </p>
      </div>
      {influencers.length > 0 && prompts.length > 0 ? (
        <GenerationLauncher
          influencers={influencers.map((influencer) => ({ id: influencer.id, label: influencer.name }))}
          prompts={prompts.map((prompt) => ({ id: prompt.id, label: prompt.title }))}
        />
      ) : (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
          Add at least one influencer and one prompt before generation can start.
        </div>
      )}
    </section>
  );
}
