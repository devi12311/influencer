import sharp from "sharp";
import { db } from "@/server/db";
import { logger } from "@/server/logger";
import { readObjectBytes, uploadObject } from "@/server/storage/minio";

const variants = [
  { label: "thumb", maxEdge: 256 },
  { label: "medium", maxEdge: 1024 },
] as const;

function createVariantObjectKey(originalKey: string, label: string) {
  const extension = originalKey.endsWith(".webp") ? ".webp" : ".webp";
  return `${originalKey}.${label}${extension}`;
}

export async function runDeriveThumbnailsJob(data: { mediaObjectId: string }) {
  const media = await db.mediaObject.findUniqueOrThrow({
    where: { id: data.mediaObjectId },
  });

  const originalBytes = await readObjectBytes(media.objectKey);

  await Promise.all(
    variants.map(async (variant) => {
      const transformed = await sharp(originalBytes)
        .rotate()
        .resize({
          fit: "inside",
          height: variant.maxEdge,
          width: variant.maxEdge,
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();

      const transformedMetadata = await sharp(transformed).metadata();
      const objectKey = createVariantObjectKey(media.objectKey, variant.label);

      await uploadObject(objectKey, transformed, "image/webp");

      await db.mediaVariant.upsert({
        where: {
          mediaObjectId_label: {
            label: variant.label,
            mediaObjectId: media.id,
          },
        },
        update: {
          bucket: media.bucket,
          height: transformedMetadata.height ?? media.height ?? variant.maxEdge,
          mimeType: "image/webp",
          objectKey,
          sizeBytes: BigInt(transformed.byteLength),
          width: transformedMetadata.width ?? media.width ?? variant.maxEdge,
        },
        create: {
          bucket: media.bucket,
          height: transformedMetadata.height ?? media.height ?? variant.maxEdge,
          label: variant.label,
          mediaObjectId: media.id,
          mimeType: "image/webp",
          objectKey,
          sizeBytes: BigInt(transformed.byteLength),
          width: transformedMetadata.width ?? media.width ?? variant.maxEdge,
        },
      });
    }),
  );

  logger.info({ mediaObjectId: media.id }, "Derived image thumbnails");
  return { mediaObjectId: media.id };
}
