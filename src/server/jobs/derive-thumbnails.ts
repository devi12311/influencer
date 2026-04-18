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

function serializeWorkerError(error: unknown) {
  if (!(error instanceof Error)) {
    return { value: String(error) };
  }

  const workerError = error as Error & {
    Code?: string;
    Key?: string;
    Bucket?: string;
    $fault?: string;
    $metadata?: Record<string, unknown>;
  };

  return {
    bucket: workerError.Bucket,
    code: workerError.Code,
    fault: workerError.$fault,
    key: workerError.Key,
    message: workerError.message,
    metadata: workerError.$metadata,
    name: workerError.name,
  };
}

export async function runDeriveThumbnailsJob(data: { mediaObjectId: string }) {
  logger.info({ mediaObjectId: data.mediaObjectId }, "derive-thumbnails started");

  const media = await db.mediaObject.findUniqueOrThrow({
    where: { id: data.mediaObjectId },
  });

  logger.info({ mediaObjectId: media.id, objectKey: media.objectKey }, "derive-thumbnails reading original object");
  const originalBytes = await readObjectBytes(media.objectKey).catch((error) => {
    logger.error({ error: serializeWorkerError(error), mediaObjectId: media.id, objectKey: media.objectKey }, "derive-thumbnails readObjectBytes failed");
    throw error;
  });
  logger.info({ byteLength: originalBytes.byteLength, mediaObjectId: media.id }, "derive-thumbnails read original bytes");

  await Promise.all(
    variants.map(async (variant) => {
      logger.info({ label: variant.label, mediaObjectId: media.id, maxEdge: variant.maxEdge }, "derive-thumbnails generating variant");
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

      await uploadObject(objectKey, transformed, "image/webp").catch((error) => {
        logger.error({ error: serializeWorkerError(error), label: variant.label, mediaObjectId: media.id, objectKey }, "derive-thumbnails uploadObject failed");
        throw error;
      });

      logger.info({ label: variant.label, mediaObjectId: media.id, objectKey }, "derive-thumbnails upserted media variant");

      logger.info({ byteLength: transformed.byteLength, height: transformedMetadata.height, label: variant.label, mediaObjectId: media.id, objectKey, width: transformedMetadata.width }, "derive-thumbnails uploaded variant object");

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
