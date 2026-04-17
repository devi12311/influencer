"use server";

import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { MediaKind } from "@prisma/client";
import sharp from "sharp";
import { z } from "zod";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { getQueue, queueNames } from "@/server/queue/queues";
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

function createObjectKey(userId: string, kind: MediaKind, filename: string, contentType: string) {
  const extension = getFileExtension(filename, contentType);
  const slug = kind.toLowerCase();
  return `users/${userId}/${slug}/${randomUUID().replaceAll("-", "")}${extension}`;
}

export async function presignUpload(input: unknown) {
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

  return {
    objectKey,
    uploadUrl: await presignPut(objectKey, parsed.contentType),
  };
}

export async function commitUpload(input: unknown) {
  const session = await auth();

  if (!session?.userId) {
    throw new Error("You must be signed in to commit uploads.");
  }

  const parsed = commitSchema.parse(input);
  assertUploadableKind(parsed.kind);

  if (!parsed.objectKey.startsWith(`users/${session.userId}/`)) {
    throw new Error("Upload object does not belong to the current user.");
  }

  const head = await headObject(parsed.objectKey);
  const actualSize = Number(head.ContentLength ?? 0);
  const actualMime = head.ContentType ?? "";

  if (actualSize !== parsed.expectedSize) {
    throw new Error("Uploaded file size does not match the expected size.");
  }

  if (actualMime !== parsed.expectedMime) {
    throw new Error("Uploaded file type does not match the expected mime type.");
  }

  const bytes = await readObjectBytes(parsed.objectKey);
  const metadata = await sharp(bytes).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to read image dimensions.");
  }

  const contentHash = createHash("sha256").update(bytes).digest("hex");

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

  await getQueue(queueNames.deriveThumbnails).add(
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

  return media;
}
