import { PublicationStatus, SocialPlatform } from "@prisma/client";
import sharp from "sharp";
import { db } from "@/server/db";
import { uploadObject, buildPublicUrl, readObjectBytes } from "@/server/storage/minio";
import { resolvePostingProvider } from "@/server/providers/registry";

function ensureHttpsUrl(url: string) {
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
}

async function createInstagramPublishableImageUrl(mediaObject: {
  id: string;
  mimeType: string;
  objectKey: string;
  userId: string;
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

async function resolveImageUrlsForPlatform(platform: SocialPlatform, postMedia: Array<{ mediaObject: { id: string; mimeType: string; objectKey: string; userId: string } }>) {
  if (platform === SocialPlatform.INSTAGRAM) {
    return Promise.all(postMedia.map(({ mediaObject }) => createInstagramPublishableImageUrl(mediaObject)));
  }

  return postMedia.map(({ mediaObject }) => ensureHttpsUrl(buildPublicUrl(mediaObject.objectKey)));
}

export async function runPublishPostJob(input: { publicationId: string }) {
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
