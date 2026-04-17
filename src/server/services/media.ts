import { MediaKind } from "@prisma/client";
import { db } from "@/server/db";
import { buildPublicUrl, deleteObject, presignGet } from "@/server/storage/minio";

export type MediaVariantSize = "medium" | "original" | "thumb";

export async function deleteMediaWithVariants(mediaObjectId: string, userId: string) {
  const media = await db.mediaObject.findFirstOrThrow({
    where: {
      id: mediaObjectId,
      userId,
    },
    include: {
      variants: true,
    },
  });

  await Promise.all(media.variants.map((variant) => deleteObject(variant.objectKey)));
  await deleteObject(media.objectKey);

  await db.mediaObject.delete({
    where: { id: media.id },
  });
}

export async function getPresignedUrl(media: {
  objectKey: string;
  variants: Array<{ label: string; objectKey: string }>;
},
size: MediaVariantSize) {
  const variant = size === "original" ? null : media.variants.find((candidate) => candidate.label === size);
  const key = variant?.objectKey ?? media.objectKey;

  if (process.env.NODE_ENV !== "production") {
    return buildPublicUrl(key);
  }

  return presignGet(key);
}

export async function listByUserAndKind(userId: string, kind: MediaKind) {
  return db.mediaObject.findMany({
    where: {
      kind,
      userId,
    },
    include: {
      variants: {
        orderBy: { label: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
