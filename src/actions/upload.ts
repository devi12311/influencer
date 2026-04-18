"use server";

import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import path from "node:path";
import { MediaKind } from "@prisma/client";
import sharp from "sharp";
import { z } from "zod";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { getQueue, queueNames } from "@/server/queue/queues";
import { withRequestLogger } from "@/server/logger";
import { getOrCreateRequestId } from "@/server/observability/request-id";
import { headObject, presignPut, readObjectBytes } from "@/server/storage/minio";

const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const presignSchema = z.object({
  contentType: z.string(),
  filename: z.string().min(1),
  kind: z.nativeEnum(MediaKind),
  size: z.number().int().positive(),
});

const commitSchema = z.object({
  expectedMime: z.string(),
  expectedSize: z.number().int().positive(),
  kind: z.nativeEnum(MediaKind),
  objectKey: z.string().min(1),
});

function getFileExtension(filename: string, mimeType: string) {
  const extensionFromMime = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  }[mimeType];

  if (extensionFromMime) {
    return extensionFromMime;
  }

  const extension = path.extname(filename).toLowerCase();
  return extension || ".bin";
}

function assertUploadableKind(kind: MediaKind) {
  if (kind === MediaKind.GENERATED_IMAGE) {
    throw new Error("This media kind cannot be uploaded directly.");
  }
}


function serializeStorageError(error: unknown) {
  if (!(error instanceof Error)) {
    return { value: String(error) };
  }

  const storageError = error as Error & {
    Code?: string;
    Key?: string;
    Bucket?: string;
    $fault?: string;
    $metadata?: Record<string, unknown>;
  };

  return {
    bucket: storageError.Bucket,
    code: storageError.Code,
    fault: storageError.$fault,
    key: storageError.Key,
    message: storageError.message,
    metadata: storageError.$metadata,
    name: storageError.name,
  };
}

function createObjectKey(userId: string, kind: MediaKind, filename: string, contentType: string) {
  const extension = getFileExtension(filename, contentType);
  const slug = kind.toLowerCase();
  return `users/${userId}/${slug}/${randomUUID().replaceAll("-", "")}${extension}`;
}

export async function presignUpload(input: unknown) {
  const requestHeaders = await headers();
  const requestLogger = withRequestLogger(getOrCreateRequestId(requestHeaders));
  const session = await auth();

  if (!session?.userId) {
    throw new Error("You must be signed in to upload media.");
  }

  const parsed = presignSchema.parse(input);
  assertUploadableKind(parsed.kind);

  if (parsed.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Uploads must be 20MB or smaller.");
  }

  if (!allowedMimeTypes.has(parsed.contentType)) {
    throw new Error("Unsupported file type.");
  }

  const objectKey = createObjectKey(session.userId, parsed.kind, parsed.filename, parsed.contentType);

  requestLogger.info({ contentType: parsed.contentType, filename: parsed.filename, kind: parsed.kind, objectKey, size: parsed.size, userId: session.userId }, "presignUpload prepared upload target");

  return {
    objectKey,
    uploadUrl: await presignPut(objectKey, parsed.contentType),
  };
}

export async function commitUpload(input: unknown) {
  const requestHeaders = await headers();
  const requestLogger = withRequestLogger(getOrCreateRequestId(requestHeaders));
  const session = await auth();

  if (!session?.userId) {
    throw new Error("You must be signed in to commit uploads.");
  }

  const parsed = commitSchema.parse(input);
  assertUploadableKind(parsed.kind);

  requestLogger.info({ expectedMime: parsed.expectedMime, expectedSize: parsed.expectedSize, kind: parsed.kind, objectKey: parsed.objectKey, userId: session.userId }, "commitUpload started");

  if (!parsed.objectKey.startsWith(`users/${session.userId}/`)) {
    requestLogger.warn({ objectKey: parsed.objectKey, userId: session.userId }, "commitUpload rejected objectKey ownership mismatch");
    throw new Error("Upload object does not belong to the current user.");
  }

  let head;
  try {
    requestLogger.info({ objectKey: parsed.objectKey }, "commitUpload heading object from storage");
    head = await headObject(parsed.objectKey);
  } catch (error) {
    requestLogger.error({ error: serializeStorageError(error), objectKey: parsed.objectKey }, "commitUpload headObject failed");
    throw error;
  }

  const actualSize = Number(head.ContentLength ?? 0);
  const actualMime = head.ContentType ?? "";
  requestLogger.info({ actualMime, actualSize, objectKey: parsed.objectKey }, "commitUpload received headObject metadata");

  if (actualSize !== parsed.expectedSize) {
    requestLogger.error({ actualSize, expectedSize: parsed.expectedSize, objectKey: parsed.objectKey }, "commitUpload size mismatch");
    throw new Error("Uploaded file size does not match the expected size.");
  }

  if (actualMime !== parsed.expectedMime) {
    requestLogger.error({ actualMime, expectedMime: parsed.expectedMime, objectKey: parsed.objectKey }, "commitUpload mime mismatch");
    throw new Error("Uploaded file type does not match the expected mime type.");
  }

  let bytes;
  try {
    requestLogger.info({ objectKey: parsed.objectKey }, "commitUpload reading object bytes from storage");
    bytes = await readObjectBytes(parsed.objectKey);
  } catch (error) {
    requestLogger.error({ error: serializeStorageError(error), objectKey: parsed.objectKey }, "commitUpload readObjectBytes failed");
    throw error;
  }

  requestLogger.info({ byteLength: bytes.byteLength, objectKey: parsed.objectKey }, "commitUpload read object bytes");

  let metadata;
  try {
    metadata = await sharp(bytes).metadata();
  } catch (error) {
    requestLogger.error({ error: serializeStorageError(error), objectKey: parsed.objectKey }, "commitUpload sharp metadata failed");
    throw error;
  }

  requestLogger.info({ height: metadata.height, objectKey: parsed.objectKey, width: metadata.width }, "commitUpload extracted image metadata");

  if (!metadata.width || !metadata.height) {
    requestLogger.error({ metadata, objectKey: parsed.objectKey }, "commitUpload missing image dimensions");
    throw new Error("Unable to read image dimensions.");
  }

  const contentHash = createHash("sha256").update(bytes).digest("hex");
  requestLogger.info({ contentHash, objectKey: parsed.objectKey }, "commitUpload computed content hash");

  const media = await db.mediaObject.upsert({
    where: {
      objectKey: parsed.objectKey,
    },
    update: {
      contentHash,
      height: metadata.height,
      mimeType: parsed.expectedMime,
      sizeBytes: BigInt(parsed.expectedSize),
      width: metadata.width,
    },
    create: {
      bucket: process.env.MINIO_BUCKET ?? "ai-influencer",
      contentHash,
      height: metadata.height,
      kind: parsed.kind,
      mimeType: parsed.expectedMime,
      objectKey: parsed.objectKey,
      sizeBytes: BigInt(parsed.expectedSize),
      userId: session.userId,
      width: metadata.width,
    },
    include: {
      variants: true,
    },
  });

  requestLogger.info({ mediaObjectId: media.id, objectKey: media.objectKey }, "commitUpload persisted media row");

  const deriveJob = await getQueue(queueNames.deriveThumbnails).add(
    queueNames.deriveThumbnails,
    { mediaObjectId: media.id },
    {
      attempts: 3,
      backoff: {
        delay: 5000,
        type: "exponential",
      },
    },
  );

  requestLogger.info({ deriveJobId: deriveJob.id, mediaObjectId: media.id, queueName: queueNames.deriveThumbnails }, "commitUpload enqueued derive-thumbnails job");

  return media;
}
