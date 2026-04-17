import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getRedisConnection } from "@/server/queue/connection";

const POST_DRAFT_TTL_SECONDS = 24 * 60 * 60;

const postDraftSchema = z.object({
  aspectRatio: z.enum(["1:1", "4:5", "9:16"]).optional(),
  currentGenerationId: z.string().optional(),
  generationIds: z.array(z.string()).default([]),
  influencerId: z.string().optional(),
  promptId: z.string().optional(),
});

export type PostDraft = z.infer<typeof postDraftSchema> & { draftId: string };

function getDraftKey(userId: string, draftId: string) {
  return `post-draft:${userId}:${draftId}`;
}

async function writeDraft(userId: string, draftId: string, draft: z.infer<typeof postDraftSchema>) {
  await getRedisConnection().set(getDraftKey(userId, draftId), JSON.stringify(draft), "EX", POST_DRAFT_TTL_SECONDS);
}

export async function createPostDraft(userId: string) {
  const draftId = randomUUID();
  await writeDraft(userId, draftId, { generationIds: [] });
  return draftId;
}

export async function getPostDraft(userId: string, draftId: string): Promise<PostDraft | null> {
  const raw = await getRedisConnection().get(getDraftKey(userId, draftId));
  if (!raw) {
    return null;
  }

  const parsed = postDraftSchema.parse(JSON.parse(raw));
  return { ...parsed, draftId };
}

export async function ensurePostDraft(userId: string, draftId?: string) {
  if (draftId) {
    const existing = await getPostDraft(userId, draftId);
    if (existing) {
      return existing;
    }
  }

  const createdDraftId = await createPostDraft(userId);
  return { draftId: createdDraftId, generationIds: [] } satisfies PostDraft;
}

export async function updatePostDraft(userId: string, draftId: string, updater: (draft: z.infer<typeof postDraftSchema>) => z.infer<typeof postDraftSchema>) {
  const currentDraft = (await getPostDraft(userId, draftId)) ?? { draftId, generationIds: [] };
  const nextDraft = updater({
    aspectRatio: currentDraft.aspectRatio,
    currentGenerationId: currentDraft.currentGenerationId,
    generationIds: currentDraft.generationIds,
    influencerId: currentDraft.influencerId,
    promptId: currentDraft.promptId,
  });
  await writeDraft(userId, draftId, nextDraft);
  return { ...nextDraft, draftId } satisfies PostDraft;
}

export async function clearPostDraft(userId: string, draftId: string) {
  await getRedisConnection().del(getDraftKey(userId, draftId));
}
