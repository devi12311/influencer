import { MediaKind } from "@prisma/client";
import { db } from "@/server/db";
import { deleteMediaWithVariants } from "@/server/services/media";

interface PromptReferenceSelection {
  mediaObjectId: string;
}

async function assertPromptMediaOwnership(userId: string, mediaObjectIds: string[]) {
  const media = await db.mediaObject.findMany({
    where: {
      id: { in: mediaObjectIds },
      kind: MediaKind.PROMPT_REFERENCE,
      userId,
    },
    include: {
      promptReferences: true,
    },
  });

  if (media.length !== mediaObjectIds.length) {
    throw new Error("Some prompt reference media were not found for this user.");
  }

  return media;
}

function normalizeTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => tag.toLowerCase()),
    ),
  );
}

function ensureReferenceLimit(referenceCount: number) {
  if (referenceCount < 0 || referenceCount > 4) {
    throw new Error("Prompts may include at most 4 reference images.");
  }
}

export async function createPrompt(input: {
  isFavorite: boolean;
  references: PromptReferenceSelection[];
  tags: string[];
  text: string;
  title: string;
  userId: string;
}) {
  ensureReferenceLimit(input.references.length);
  const ownedMedia = await assertPromptMediaOwnership(
    input.userId,
    input.references.map((reference) => reference.mediaObjectId),
  );

  if (ownedMedia.some((media) => media.promptReferences.length > 0)) {
    throw new Error("Some prompt reference media are already attached to a prompt.");
  }

  return db.prompt.create({
    data: {
      isFavorite: input.isFavorite,
      references: {
        create: input.references.map((reference, index) => ({
          mediaObjectId: reference.mediaObjectId,
          sortOrder: index,
        })),
      },
      tags: normalizeTags(input.tags),
      text: input.text,
      title: input.title,
      userId: input.userId,
    },
  });
}

export async function updatePrompt(input: {
  id: string;
  isFavorite: boolean;
  tags: string[];
  text: string;
  title: string;
  userId: string;
}) {
  const prompt = await db.prompt.findFirstOrThrow({
    where: { id: input.id, userId: input.userId },
  });

  return db.prompt.update({
    where: { id: prompt.id },
    data: {
      isFavorite: input.isFavorite,
      tags: normalizeTags(input.tags),
      text: input.text,
      title: input.title,
    },
  });
}

export async function addPromptReferences(input: {
  id: string;
  references: PromptReferenceSelection[];
  userId: string;
}) {
  const prompt = await db.prompt.findFirstOrThrow({
    where: { id: input.id, userId: input.userId },
    include: { references: true },
  });

  const nextReferenceCount = prompt.references.length + input.references.length;
  ensureReferenceLimit(nextReferenceCount);

  const ownedMedia = await assertPromptMediaOwnership(
    input.userId,
    input.references.map((reference) => reference.mediaObjectId),
  );

  if (ownedMedia.some((media) => media.promptReferences.length > 0)) {
    throw new Error("Some prompt reference media are already attached to a prompt.");
  }

  await db.promptReference.createMany({
    data: input.references.map((reference, index) => ({
      mediaObjectId: reference.mediaObjectId,
      promptId: prompt.id,
      sortOrder: prompt.references.length + index,
    })),
  });
}

export async function removePromptReference(input: {
  mediaObjectId: string;
  promptId: string;
  userId: string;
}) {
  const prompt = await db.prompt.findFirstOrThrow({
    where: { id: input.promptId, userId: input.userId },
    include: { references: true },
  });

  const reference = prompt.references.find((item) => item.mediaObjectId === input.mediaObjectId);
  if (!reference) {
    throw new Error("Prompt reference not found.");
  }

  await db.promptReference.delete({ where: { id: reference.id } });
  await deleteMediaWithVariants(input.mediaObjectId, input.userId);
}

export async function deletePrompt(input: { id: string; userId: string }) {
  const prompt = await db.prompt.findFirstOrThrow({
    where: { id: input.id, userId: input.userId },
    include: { references: true },
  });

  for (const reference of prompt.references) {
    await deleteMediaWithVariants(reference.mediaObjectId, input.userId);
  }

  await db.prompt.delete({ where: { id: prompt.id } });
}

export async function listPromptsByUser(input: {
  favoriteOnly?: boolean;
  search?: string;
  tag?: string;
  userId: string;
}) {
  const search = input.search?.trim();
  const tag = input.tag?.trim().toLowerCase();

  return db.prompt.findMany({
    where: {
      isFavorite: input.favoriteOnly ? true : undefined,
      tags: tag ? { has: tag } : undefined,
      userId: input.userId,
      OR: search
        ? [
            { title: { contains: search, mode: "insensitive" } },
            { text: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: {
      references: {
        include: {
          mediaObject: {
            include: { variants: true },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
  });
}

export async function listPromptTagsByUser(userId: string) {
  const prompts = await db.prompt.findMany({
    where: { userId },
    select: { tags: true },
  });

  return Array.from(new Set(prompts.flatMap((prompt) => prompt.tags))).sort();
}

export async function listUnassignedPromptMedia(userId: string) {
  return db.mediaObject.findMany({
    where: {
      kind: MediaKind.PROMPT_REFERENCE,
      promptReferences: { none: {} },
      userId,
    },
    include: {
      variants: { orderBy: { label: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPromptById(input: { id: string; userId: string }) {
  return db.prompt.findFirstOrThrow({
    where: { id: input.id, userId: input.userId },
    include: {
      references: {
        include: {
          mediaObject: {
            include: { variants: { orderBy: { label: "asc" } } },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}
