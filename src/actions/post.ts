"use server";

import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { generateImage } from "@/actions/generation";
import { savePostFromDraft as persistPostFromDraft } from "@/server/services/post";
import { updatePostDraft } from "@/server/services/post-draft";

async function requireUserId() {
  const session = await auth();
  if (!session?.userId) {
    redirect("/login?redirect=/new-post");
  }
  return session.userId;
}

export async function selectDraftInfluencerAction(formData: FormData) {
  const userId = await requireUserId();
  const draftId = String(formData.get("draftId") ?? "");
  const influencerId = String(formData.get("influencerId") ?? "");

  await updatePostDraft(userId, draftId, (draft) => ({
    ...draft,
    currentGenerationId: undefined,
    generationIds: [],
    influencerId,
  }));

  redirect(`/new-post?draft=${draftId}&step=2`);
}

export async function selectDraftPromptAction(formData: FormData) {
  const userId = await requireUserId();
  const draftId = String(formData.get("draftId") ?? "");
  const promptId = String(formData.get("promptId") ?? "");

  await updatePostDraft(userId, draftId, (draft) => ({
    ...draft,
    aspectRatio: draft.aspectRatio ?? "4:5",
    currentGenerationId: undefined,
    generationIds: [],
    promptId,
  }));

  redirect(`/new-post?draft=${draftId}&step=3`);
}

export async function startDraftGeneration(input: { aspectRatio?: "1:1" | "4:5" | "9:16"; draftId: string }) {
  const userId = await requireUserId();
  const draft = await updatePostDraft(userId, input.draftId, (currentDraft) => currentDraft);

  if (!draft.influencerId || !draft.promptId) {
    throw new Error("Select an influencer and a prompt before generating.");
  }

  const result = await generateImage({
    aspectRatio: input.aspectRatio,
    influencerId: draft.influencerId,
    promptId: draft.promptId,
  });

  await updatePostDraft(userId, input.draftId, (currentDraft) => ({
    ...currentDraft,
    aspectRatio: input.aspectRatio ?? currentDraft.aspectRatio,
    currentGenerationId: result.generationId,
    generationIds: [...currentDraft.generationIds, result.generationId],
  }));

  return result;
}

export async function chooseDraftGenerationAction(input: { draftId: string; generationId: string }) {
  const userId = await requireUserId();
  await updatePostDraft(userId, input.draftId, (draft) => ({
    ...draft,
    currentGenerationId: input.generationId,
  }));
}

export async function savePostFromDraftAction(formData: FormData) {
  const userId = await requireUserId();
  const draftId = String(formData.get("draftId") ?? "");
  const winnerGenerationId = String(formData.get("winnerGenerationId") ?? "");
  const title = String(formData.get("title") ?? "").trim() || null;
  const caption = String(formData.get("caption") ?? "").trim() || null;

  const postId = await persistPostFromDraft({
    caption,
    draftId,
    title,
    userId,
    winnerGenerationId,
  });

  redirect(`/posts/${postId}`);
}
