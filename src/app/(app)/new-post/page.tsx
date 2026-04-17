export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { StepGenerate } from "@/components/wizard/step-generate";
import { StepInfluencer } from "@/components/wizard/step-influencer";
import { StepPrompt } from "@/components/wizard/step-prompt";
import { StepReview } from "@/components/wizard/step-review";
import { getGenerationById } from "@/server/services/generation";
import { getPresignedUrl } from "@/server/services/media";
import { listInfluencersByUser } from "@/server/services/influencer";
import { getPostDraft, createPostDraft } from "@/server/services/post-draft";
import { listPromptsByUser } from "@/server/services/prompt";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string; step?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();

  if (!session?.userId) {
    redirect("/login?redirect=/new-post");
  }

  let draftId = params.draft;
  let draft = draftId ? await getPostDraft(session.userId, draftId) : null;

  if (!draft) {
    draftId = await createPostDraft(session.userId);
    redirect(`/new-post?draft=${draftId}&step=1`);
  }

  const step = Number(params.step ?? 1);

  if (step <= 1) {
    const influencers = await listInfluencersByUser(session.userId);
    return <StepInfluencer draftId={draft.draftId} influencers={influencers} />;
  }

  if (!draft.influencerId) {
    redirect(`/new-post?draft=${draft.draftId}&step=1`);
  }

  if (step === 2) {
    const prompts = await listPromptsByUser({ userId: session.userId });
    return <StepPrompt draftId={draft.draftId} prompts={prompts} />;
  }

  if (!draft.promptId) {
    redirect(`/new-post?draft=${draft.draftId}&step=2`);
  }

  const [influencers, prompts] = await Promise.all([
    listInfluencersByUser(session.userId),
    listPromptsByUser({ userId: session.userId }),
  ]);
  const influencer = influencers.find((item) => item.id === draft.influencerId);
  const prompt = prompts.find((item) => item.id === draft.promptId);

  if (!influencer || !prompt) {
    redirect(`/new-post?draft=${draft.draftId}&step=1`);
  }

  if (step === 3) {
    const generations = await Promise.all(
      draft.generationIds.map(async (generationId) => {
        const generation = await getGenerationById({ id: generationId, userId: session.userId });
        return {
          id: generation.id,
          outputMediaUrl: generation.outputMedia ? await getPresignedUrl(generation.outputMedia, "thumb") : null,
          status: generation.status,
        };
      }),
    );

    return (
      <StepGenerate
        draftId={draft.draftId}
        influencerName={influencer.name}
        initialAspectRatio={draft.aspectRatio}
        initialCurrentGenerationId={draft.currentGenerationId}
        initialGenerations={generations}
        promptTitle={prompt.title}
      />
    );
  }

  if (!draft.currentGenerationId) {
    redirect(`/new-post?draft=${draft.draftId}&step=3`);
  }

  const generation = await getGenerationById({ id: draft.currentGenerationId, userId: session.userId });

  if (!generation.outputMedia) {
    redirect(`/new-post?draft=${draft.draftId}&step=3`);
  }

  return (
    <StepReview
      draftId={draft.draftId}
      generation={generation}
      influencerName={influencer.name}
      promptTitle={prompt.title}
    />
  );
}
