import { PublicationStatus, SocialPlatform } from "@prisma/client";
import sharp from "sharp";
import { db } from "@/server/db";
import { resolvePostingProvider } from "@/server/providers/registry";
import { getQueue, queueNames } from "@/server/queue/queues";
import { buildPublicUrl, readObjectBytes, uploadObject } from "@/server/storage/minio";

const TIKTOK_STATUS_POLL_DELAY_MS = 15_000;
const TIKTOK_STATUS_POLL_LIMIT = 20;

interface PublishPostJobInput {
  pollAttempt?: number;
  publicationId: string;
}

function ensureHttpsUrl(url: string) {
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
}

async function createInstagramPublishableImageUrl(mediaObject: {
  mimeType: string;
  objectKey: string;
}) {
  if (mediaObject.mimeType === "image/jpeg") {
    return ensureHttpsUrl(buildPublicUrl(mediaObject.objectKey));
  }

  const originalBytes = await readObjectBytes(mediaObject.objectKey);
  const jpegBytes = await sharp(originalBytes).jpeg({ quality: 90 }).toBuffer();
  const publishKey = `${mediaObject.objectKey}.instagram-publish.jpg`;

  await uploadObject(publishKey, jpegBytes, "image/jpeg");
  return ensureHttpsUrl(buildPublicUrl(publishKey));
}

async function createTikTokPublishableImageUrls(postMedia: Array<{ mediaObject: { mimeType: string; objectKey: string } }>) {
  return Promise.all(
    postMedia.map(async ({ mediaObject }) => {
      if (mediaObject.mimeType === "image/png" || mediaObject.mimeType === "image/jpeg" || mediaObject.mimeType === "image/webp") {
        return ensureHttpsUrl(buildPublicUrl(mediaObject.objectKey));
      }

      const originalBytes = await readObjectBytes(mediaObject.objectKey);
      const pngBytes = await sharp(originalBytes).png().toBuffer();
      const publishKey = `${mediaObject.objectKey}.tiktok-publish.png`;
      await uploadObject(publishKey, pngBytes, "image/png");
      return ensureHttpsUrl(buildPublicUrl(publishKey));
    }),
  );
}

async function resolveImageUrlsForPlatform(
  platform: SocialPlatform,
  postMedia: Array<{ mediaObject: { mimeType: string; objectKey: string } }>,
) {
  if (platform === SocialPlatform.INSTAGRAM) {
    return Promise.all(postMedia.map(({ mediaObject }) => createInstagramPublishableImageUrl(mediaObject)));
  }

  if (platform === SocialPlatform.TIKTOK) {
    return createTikTokPublishableImageUrls(postMedia);
  }

  return postMedia.map(({ mediaObject }) => ensureHttpsUrl(buildPublicUrl(mediaObject.objectKey)));
}

async function scheduleTikTokStatusPoll(publicationId: string, pollAttempt: number) {
  await getQueue(queueNames.publishPost).add(
    queueNames.publishPost,
    { pollAttempt, publicationId },
    {
      delay: TIKTOK_STATUS_POLL_DELAY_MS * pollAttempt,
      removeOnComplete: true,
    },
  );
}

async function handleTikTokStatusPoll(input: PublishPostJobInput) {
  const publication = await db.postPublication.findUniqueOrThrow({
    where: { id: input.publicationId },
    include: {
      socialConnection: true,
    },
  });

  if (!publication.externalId) {
    throw new Error("TikTok publication is missing the publish identifier.");
  }

  const provider = resolvePostingProvider(publication.platform);

  if (!provider.getStatus) {
    throw new Error("TikTok provider does not support status polling.");
  }

  const status = await provider.getStatus(publication.externalId, publication.socialConnectionId);

  if (status.status === "done") {
    await db.postPublication.update({
      where: { id: publication.id },
      data: {
        externalId: status.externalId ?? publication.externalId,
        publishedAt: new Date(),
        status: PublicationStatus.PUBLISHED,
      },
    });
    return status;
  }

  if (status.status === "failed") {
    await db.postPublication.update({
      where: { id: publication.id },
      data: {
        errorMessage: status.error ?? "TikTok publish failed.",
        status: PublicationStatus.FAILED,
      },
    });
    return status;
  }

  const nextAttempt = (input.pollAttempt ?? 0) + 1;

  if (nextAttempt > TIKTOK_STATUS_POLL_LIMIT) {
    await db.postPublication.update({
      where: { id: publication.id },
      data: {
        errorMessage: "TikTok publish status did not resolve before timeout.",
        status: PublicationStatus.FAILED,
      },
    });
    return { status: "failed" as const };
  }

  await scheduleTikTokStatusPoll(publication.id, nextAttempt);
  return status;
}

export async function runPublishPostJob(input: PublishPostJobInput) {
  if (typeof input.pollAttempt === "number") {
    return handleTikTokStatusPoll(input);
  }

  const publication = await db.postPublication.findUniqueOrThrow({
    where: { id: input.publicationId },
    include: {
      post: {
        include: {
          media: {
            include: {
              mediaObject: true,
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      socialConnection: true,
    },
  });

  await db.postPublication.update({
    where: { id: publication.id },
    data: { status: PublicationStatus.PUBLISHING },
  });

  const provider = resolvePostingProvider(publication.platform);
  const imageUrls = await resolveImageUrlsForPlatform(publication.platform, publication.post.media);
  const caption = publication.caption ?? publication.post.caption ?? undefined;

  try {
    const result =
      imageUrls.length === 1
        ? await provider.publishImage({
            caption,
            connectionId: publication.socialConnectionId,
            imageUrl: imageUrls[0],
            options: (publication.options as Record<string, unknown> | undefined) ?? {},
          })
        : await provider.publishCarousel({
            caption,
            connectionId: publication.socialConnectionId,
            imageUrls,
            options: (publication.options as Record<string, unknown> | undefined) ?? {},
          });

    if (publication.platform === SocialPlatform.TIKTOK && provider.getStatus) {
      await db.postPublication.update({
        where: { id: publication.id },
        data: {
          externalId: result.externalId,
          status: PublicationStatus.PUBLISHING,
        },
      });
      await scheduleTikTokStatusPoll(publication.id, 1);
      return result;
    }

    await db.postPublication.update({
      where: { id: publication.id },
      data: {
        externalId: result.externalId,
        publishedAt: new Date(),
        status: PublicationStatus.PUBLISHED,
      },
    });

    return result;
  } catch (caughtError) {
    await db.postPublication.update({
      where: { id: publication.id },
      data: {
        errorMessage: caughtError instanceof Error ? caughtError.message : String(caughtError),
        status: PublicationStatus.FAILED,
      },
    });
    throw caughtError;
  }
}
