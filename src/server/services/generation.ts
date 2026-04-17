import { MediaKind, Prisma } from "@prisma/client";
import type { GenerationAspectRatio, GenerationImageSize } from "@/server/image-generation/generator";
import { db } from "@/server/db";
import { getQueue, queueNames } from "@/server/queue/queues";

const MAX_REFERENCE_MEDIA = 8;
const DEFAULT_GENERATION_COST_USD = new Prisma.Decimal("0.039000");

export function buildPromptText(prompt: { text: string }, influencer: { description?: string | null; name: string; styleNotes?: string | null }) {
  return [
    `Subject: ${influencer.name} — ${influencer.description ?? ""}`,
    influencer.styleNotes ? `Style notes: ${influencer.styleNotes}` : null,
    `Scene: ${prompt.text}`,
    "Keep the subject's face and identity consistent with the reference photos.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function createAndEnqueueGeneration(input: {
  aspectRatio?: GenerationAspectRatio;
  imageSize?: GenerationImageSize;
  influencerId: string;
  model?: string;
  promptId: string;
  userId: string;
}) {
  const influencer = await db.influencer.findFirstOrThrow({
    where: {
      id: input.influencerId,
      userId: input.userId,
    },
    include: {
      assets: {
        orderBy: [{ isCanonical: "desc" }, { sortOrder: "asc" }],
      },
    },
  });
  const prompt = await db.prompt.findFirstOrThrow({
    where: {
      id: input.promptId,
      userId: input.userId,
    },
    include: {
      references: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const canonicalMediaIds = influencer.assets.filter((asset) => asset.isCanonical).map((asset) => asset.mediaObjectId);
  const promptReferenceIds = prompt.references.map((reference) => reference.mediaObjectId);
  const inputMediaIds = [...canonicalMediaIds, ...promptReferenceIds].slice(0, MAX_REFERENCE_MEDIA);

  if (inputMediaIds.length === 0) {
    throw new Error("At least one reference image is required before generation.");
  }

  const generation = await db.generation.create({
    data: {
      aspectRatio: input.aspectRatio ?? "4:5",
      imageSize: input.imageSize ?? "2K",
      influencerId: influencer.id,
      inputMediaIds,
      model: input.model ?? "gemini-2.5-flash-image",
      promptId: prompt.id,
      promptSnapshot: buildPromptText(prompt, influencer),
      userId: input.userId,
    },
  });

  await getQueue(queueNames.generateImage).add(
    queueNames.generateImage,
    { generationId: generation.id },
    {
      attempts: 3,
      backoff: {
        delay: 5_000,
        type: "exponential",
      },
    },
  );

  return generation.id;
}

export async function getGenerationById(input: { id: string; userId: string }) {
  return db.generation.findFirstOrThrow({
    where: {
      id: input.id,
      userId: input.userId,
    },
    include: {
      outputMedia: {
        include: {
          variants: {
            orderBy: { label: "asc" },
          },
        },
      },
      influencer: true,
      prompt: true,
    },
  });
}

export async function getGenerationJobData(generationId: string) {
  return db.generation.findUniqueOrThrow({
    where: { id: generationId },
    include: {
      influencer: {
        include: {
          assets: {
            include: {
              mediaObject: true,
            },
            orderBy: [{ isCanonical: "desc" }, { sortOrder: "asc" }],
          },
        },
      },
      prompt: {
        include: {
          references: {
            include: {
              mediaObject: true,
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });
}

export async function markGenerationRunning(generationId: string) {
  await db.generation.update({
    where: { id: generationId },
    data: {
      startedAt: new Date(),
      status: "RUNNING",
    },
  });
}

export async function completeGeneration(input: {
  generationId: string;
  mediaObjectId: string;
  tokensIn?: number;
  tokensOut?: number;
}) {
  await db.generation.update({
    where: { id: input.generationId },
    data: {
      costUsd: DEFAULT_GENERATION_COST_USD,
      finishedAt: new Date(),
      outputMediaId: input.mediaObjectId,
      status: "SUCCEEDED",
      tokensIn: input.tokensIn,
      tokensOut: input.tokensOut,
    },
  });
}

export async function failGeneration(input: { errorMessage: string; generationId: string }) {
  await db.generation.update({
    where: { id: input.generationId },
    data: {
      errorMessage: input.errorMessage,
      finishedAt: new Date(),
      status: "FAILED",
    },
  });
}

export async function createGeneratedMediaObject(input: {
  contentHash: string;
  height?: number | null;
  mimeType: string;
  objectKey: string;
  sizeBytes: bigint;
  synthId: boolean;
  userId: string;
  width?: number | null;
}) {
  return db.mediaObject.create({
    data: {
      bucket: process.env.MINIO_BUCKET ?? "ai-influencer",
      contentHash: input.contentHash,
      height: input.height,
      kind: MediaKind.GENERATED_IMAGE,
      mimeType: input.mimeType,
      objectKey: input.objectKey,
      sizeBytes: input.sizeBytes,
      synthId: input.synthId,
      userId: input.userId,
      width: input.width,
    },
  });
}

export async function getUsageSummary(userId: string) {
  const [generationAggregate, publicationCount] = await Promise.all([
    db.generation.aggregate({
      where: { userId },
      _count: { id: true },
      _sum: { costUsd: true },
    }),
    db.postPublication.count({ where: { post: { userId } } }),
  ]);

  return {
    estimatedCostUsd: generationAggregate._sum.costUsd ?? new Prisma.Decimal(0),
    generationCount: generationAggregate._count.id,
    publishCount: publicationCount,
  };
}
