"use server";

import { redirect } from "next/navigation";
import { Prisma, PublicationStatus, type SocialPlatform } from "@prisma/client";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { getQueue, queueNames } from "@/server/queue/queues";
import { savePostFromDraft as persistPostFromDraft } from "@/server/services/post";
import { updatePostDraft } from "@/server/services/post-draft";

async function requireUserId() {
  const session = await auth();
  if (!session?.userId) {
    redirect("/login?redirect=/new-post");
  }
  return session.userId;
}

function parseBoolean(value: FormDataEntryValue | null) {
  return String(value ?? "") === "true" || String(value ?? "") === "on";
}

function parseOptionalString(value: FormDataEntryValue | null) {
  const parsed = String(value ?? "").trim();
  return parsed.length > 0 ? parsed : undefined;
}

async function enqueuePublication(publicationId: string, scheduledAt?: Date) {
  const delay = scheduledAt ? Math.max(0, scheduledAt.getTime() - Date.now()) : 0;
  await getQueue(queueNames.publishPost).add(
    queueNames.publishPost,
    { publicationId },
    {
      attempts: 3,
      backoff: {
        delay: 5_000,
        type: "exponential",
      },
      delay,
    },
  );
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

  const { generateImage } = await import("@/actions/generation");
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

export async function createPublicationsAction(formData: FormData) {
  const userId = await requireUserId();
  const postId = String(formData.get("postId") ?? "");
  const selectedConnectionIds = formData
    .getAll("selectedConnectionIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  const post = await db.post.findFirstOrThrow({
    where: { id: postId, userId },
  });

  const connections = await db.socialConnection.findMany({
    where: {
      id: { in: selectedConnectionIds },
      status: { in: ["active", "needs_reauth"] },
      userId,
    },
  });

  for (const connection of connections) {
    const caption = parseOptionalString(formData.get(`caption_${connection.id}`));
    const privacyLevel = parseOptionalString(formData.get(`privacy_${connection.id}`));
    const replyControl = parseOptionalString(formData.get(`reply_${connection.id}`));
    const scheduledAtValue = parseOptionalString(formData.get(`scheduledAt_${connection.id}`));
    const scheduledAt = scheduledAtValue ? new Date(scheduledAtValue) : undefined;
    const options: Record<string, unknown> = {
      disable_comment: parseBoolean(formData.get(`disableComment_${connection.id}`)),
    };

    if (privacyLevel) options.privacy_level = privacyLevel;
    if (replyControl) options.reply_control = replyControl;
    if (connection.platform === "TIKTOK") {
      options.auto_add_music = parseBoolean(formData.get(`autoMusic_${connection.id}`));
    }

    const existingPublication = await db.postPublication.findFirst({
      where: {
        postId: post.id,
        socialConnectionId: connection.id,
      },
    });

    const publication = existingPublication
      ? await db.postPublication.update({
          where: { id: existingPublication.id },
          data: {
            caption,
            errorMessage: null,
            options: options as Prisma.InputJsonValue,
            platform: connection.platform as SocialPlatform,
            scheduledAt,
            status: scheduledAt && scheduledAt > new Date() ? PublicationStatus.SCHEDULED : PublicationStatus.DRAFT,
          },
        })
      : await db.postPublication.create({
          data: {
            caption,
            options: options as Prisma.InputJsonValue,
            platform: connection.platform as SocialPlatform,
            postId: post.id,
            scheduledAt,
            socialConnectionId: connection.id,
            status: scheduledAt && scheduledAt > new Date() ? PublicationStatus.SCHEDULED : PublicationStatus.DRAFT,
          },
        });

    await enqueuePublication(publication.id, scheduledAt);
  }

  redirect(`/posts/${post.id}`);
}

export async function retryPublicationAction(publicationId: string) {
  const userId = await requireUserId();

  const publication = await db.postPublication.findFirstOrThrow({
    where: {
      id: publicationId,
      post: { userId },
    },
  });

  await db.postPublication.update({
    where: { id: publication.id },
    data: {
      errorMessage: null,
      status: PublicationStatus.DRAFT,
    },
  });

  await enqueuePublication(publication.id);
  redirect(`/posts/${publication.postId}`);
}

export async function cancelScheduledPublicationAction(publicationId: string) {
  const userId = await requireUserId();

  const publication = await db.postPublication.findFirstOrThrow({
    where: {
      id: publicationId,
      post: { userId },
      status: PublicationStatus.SCHEDULED,
    },
  });

  await db.postPublication.update({
    where: { id: publication.id },
    data: {
      scheduledAt: null,
      status: PublicationStatus.DRAFT,
    },
  });

  redirect(`/posts/${publication.postId}`);
}
