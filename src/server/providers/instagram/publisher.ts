import { SocialPlatform } from "@prisma/client";
import type { PostingProvider } from "@/server/providers/posting-provider";
import {
  createMediaContainer,
  getMediaContainerStatus,
  getPublishingLimit,
  publishMediaContainer,
} from "@/server/providers/instagram/client";
import { getInstagramConnectionCredentials } from "@/server/services/social-connection";

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_DURATION_MS = 180_000;

function wait(durationMs: number) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

async function waitForFinishedContainer(accessToken: string, creationId: string) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < MAX_POLL_DURATION_MS) {
    const status = await getMediaContainerStatus(accessToken, creationId);

    if (status.status_code === "FINISHED" || status.status_code === "PUBLISHED") {
      return status;
    }

    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new Error(`Instagram media container failed with status ${status.status_code}.`);
    }

    await wait(POLL_INTERVAL_MS);
  }

  throw new Error("Instagram media container did not finish before timeout.");
}

async function assertPublishingCapacity(accessToken: string, userId: string) {
  const limit = await getPublishingLimit(accessToken, userId);
  const quotaUsage = limit.quota_usage ?? 0;
  const quotaTotal = limit.config?.quota_total ?? 100;

  if (quotaUsage >= quotaTotal) {
    throw new Error("Instagram publishing limit reached for the rolling 24 hour window.");
  }
}

async function publishSingleImage(connectionId: string, imageUrl: string, caption?: string) {
  const connection = await getInstagramConnectionCredentials(connectionId);
  await assertPublishingCapacity(connection.accessToken, connection.externalAccountId);

  const container = await createMediaContainer({
    accessToken: connection.accessToken,
    caption,
    imageUrl,
    userId: connection.externalAccountId,
  });

  await waitForFinishedContainer(connection.accessToken, container.id);

  return publishMediaContainer({
    accessToken: connection.accessToken,
    creationId: container.id,
    userId: connection.externalAccountId,
  });
}

async function publishCarousel(connectionId: string, imageUrls: string[], caption?: string) {
  if (imageUrls.length < 2 || imageUrls.length > 10) {
    throw new Error("Instagram carousels require between 2 and 10 images.");
  }

  const connection = await getInstagramConnectionCredentials(connectionId);
  await assertPublishingCapacity(connection.accessToken, connection.externalAccountId);

  const children = [] as string[];

  for (const imageUrl of imageUrls) {
    const child = await createMediaContainer({
      accessToken: connection.accessToken,
      imageUrl,
      isCarouselItem: true,
      userId: connection.externalAccountId,
    });
    await waitForFinishedContainer(connection.accessToken, child.id);
    children.push(child.id);
  }

  const parent = await createMediaContainer({
    accessToken: connection.accessToken,
    caption,
    children,
    mediaType: "CAROUSEL",
    userId: connection.externalAccountId,
  });

  await waitForFinishedContainer(connection.accessToken, parent.id);

  return publishMediaContainer({
    accessToken: connection.accessToken,
    creationId: parent.id,
    userId: connection.externalAccountId,
  });
}

export const instagramPublisher: PostingProvider = {
  platform: SocialPlatform.INSTAGRAM,
  async publishCarousel(input) {
    const published = await publishCarousel(input.connectionId, input.imageUrls, input.caption);
    return { externalId: published.id };
  },
  async publishImage(input) {
    const published = await publishSingleImage(input.connectionId, input.imageUrl, input.caption);
    return { externalId: published.id };
  },
};
