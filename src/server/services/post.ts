import { db } from "@/server/db";
import { clearPostDraft, getPostDraft } from "@/server/services/post-draft";

export async function savePostFromDraft(input: {
  caption?: string | null;
  draftId: string;
  title?: string | null;
  userId: string;
  winnerGenerationId: string;
}) {
  const draft = await getPostDraft(input.userId, input.draftId);

  if (!draft || !draft.influencerId || !draft.promptId) {
    throw new Error("Post draft is incomplete.");
  }

  if (!draft.generationIds.includes(input.winnerGenerationId)) {
    throw new Error("Selected generation does not belong to this draft.");
  }

  const generation = await db.generation.findFirstOrThrow({
    where: {
      id: input.winnerGenerationId,
      userId: input.userId,
    },
  });

  if (!generation.outputMediaId) {
    throw new Error("The selected generation does not have output media yet.");
  }

  const post = await db.post.create({
    data: {
      caption: input.caption,
      influencerId: draft.influencerId,
      title: input.title,
      userId: input.userId,
      media: {
        create: {
          mediaObjectId: generation.outputMediaId,
          sortOrder: 0,
        },
      },
    },
  });

  await clearPostDraft(input.userId, input.draftId);
  return post.id;
}

export async function listPostsByUser(userId: string) {
  return db.post.findMany({
    where: { userId },
    include: {
      influencer: true,
      media: {
        include: {
          mediaObject: {
            include: {
              variants: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      publications: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPostById(input: { id: string; userId: string }) {
  return db.post.findFirstOrThrow({
    where: { id: input.id, userId: input.userId },
    include: {
      influencer: true,
      media: {
        include: {
          mediaObject: {
            include: {
              variants: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      publications: {
        include: {
          socialConnection: true,
        },
      },
    },
  });
}
