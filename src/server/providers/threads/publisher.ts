import { SocialPlatform } from "@prisma/client";
import type { PostingProvider } from "@/server/providers/posting-provider";
import {
  createThreadsContainer,
  getThreadsContainerStatus,
  publishThreadsContainer,
} from "@/server/providers/threads/client";
import { getThreadsConnectionCredentials } from "@/server/services/social-connection";

const THREADS_PUBLISH_WAIT_MS = 30_000;
const THREADS_MAX_CAPTION_LENGTH = 500;

function wait(durationMs: number) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

function normalizeCaption(caption?: string) {
  if (!caption) {
    return undefined;
  }

  return caption.length > THREADS_MAX_CAPTION_LENGTH ? caption.slice(0, THREADS_MAX_CAPTION_LENGTH) : caption;
}

async function waitForFinishedContainer(accessToken: string, containerId: string) {
  await wait(THREADS_PUBLISH_WAIT_MS);
  const status = await getThreadsContainerStatus(accessToken, containerId);

  if (status.status === "ERROR" || status.status === "EXPIRED") {
    throw new Error(`Threads container failed with status ${status.status}.`);
  }

  return status;
}

async function publishSingleImage(connectionId: string, imageUrl: string, caption?: string, options?: Record<string, unknown>) {
  const connection = await getThreadsConnectionCredentials(connectionId);
  const container = await createThreadsContainer({
    accessToken: connection.accessToken,
    imageUrl,
    mediaType: "IMAGE",
    replyControl: typeof options?.reply_control === "string" ? options.reply_control : undefined,
    text: normalizeCaption(caption),
    userId: connection.externalAccountId,
  });

  await waitForFinishedContainer(connection.accessToken, container.id);
  return publishThreadsContainer({
    accessToken: connection.accessToken,
    creationId: container.id,
    userId: connection.externalAccountId,
  });
}

async function publishCarousel(connectionId: string, imageUrls: string[], caption?: string, options?: Record<string, unknown>) {
  if (imageUrls.length < 2 || imageUrls.length > 20) {
    throw new Error("Threads carousels require between 2 and 20 images.");
  }

  const connection = await getThreadsConnectionCredentials(connectionId);
  const children: string[] = [];

  for (const imageUrl of imageUrls) {
    const child = await createThreadsContainer({
      accessToken: connection.accessToken,
      imageUrl,
      isCarouselItem: true,
      replyControl: typeof options?.reply_control === "string" ? options.reply_control : undefined,
      userId: connection.externalAccountId,
    });

    await waitForFinishedContainer(connection.accessToken, child.id);
    children.push(child.id);
  }

  const parent = await createThreadsContainer({
    accessToken: connection.accessToken,
    children,
    mediaType: "CAROUSEL",
    replyControl: typeof options?.reply_control === "string" ? options.reply_control : undefined,
    text: normalizeCaption(caption),
    userId: connection.externalAccountId,
  });

  await waitForFinishedContainer(connection.accessToken, parent.id);
  return publishThreadsContainer({
    accessToken: connection.accessToken,
    creationId: parent.id,
    userId: connection.externalAccountId,
  });
}

export const threadsPublisher: PostingProvider = {
  platform: SocialPlatform.THREADS,
  async publishCarousel(input) {
    const published = await publishCarousel(input.connectionId, input.imageUrls, input.caption, input.options);
    return { externalId: published.id };
  },
  async publishImage(input) {
    const published = await publishSingleImage(input.connectionId, input.imageUrl, input.caption, input.options);
    return { externalId: published.id };
  },
};
