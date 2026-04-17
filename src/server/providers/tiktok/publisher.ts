import { SocialPlatform } from "@prisma/client";
import type { PostingProvider } from "@/server/providers/posting-provider";
import { fetchPostStatus, initPhotoPost, queryCreatorInfo } from "@/server/providers/tiktok/client";
import { getCachedTikTokCreatorInfo, setCachedTikTokCreatorInfo } from "@/server/providers/tiktok/cache";
import { getTikTokConnectionCredentials } from "@/server/services/social-connection";

const UNAUDITED_PRIVACY_LEVEL = "SELF_ONLY";
const TIKTOK_MAX_DESCRIPTION_LENGTH = 4000;
const TIKTOK_MAX_TITLE_LENGTH = 90;

function normalizeDescription(description?: string) {
  if (!description) {
    return undefined;
  }

  return description.length > TIKTOK_MAX_DESCRIPTION_LENGTH ? description.slice(0, TIKTOK_MAX_DESCRIPTION_LENGTH) : description;
}

function normalizeTitle(title?: string) {
  if (!title) {
    return undefined;
  }

  return title.length > TIKTOK_MAX_TITLE_LENGTH ? title.slice(0, TIKTOK_MAX_TITLE_LENGTH) : title;
}

export async function getTikTokCreatorInfo(connectionId: string) {
  const cached = await getCachedTikTokCreatorInfo(connectionId);
  if (cached) {
    return cached;
  }

  const connection = await getTikTokConnectionCredentials(connectionId);
  const creatorInfoResponse = await queryCreatorInfo(connection.accessToken);
  await setCachedTikTokCreatorInfo(connectionId, creatorInfoResponse.data);
  return creatorInfoResponse.data;
}

function resolvePrivacyLevel(creatorInfo: Awaited<ReturnType<typeof getTikTokCreatorInfo>>, requestedPrivacyLevel?: string) {
  const options = creatorInfo.privacy_level_options ?? [UNAUDITED_PRIVACY_LEVEL];

  if (options.includes(UNAUDITED_PRIVACY_LEVEL)) {
    return UNAUDITED_PRIVACY_LEVEL;
  }

  if (requestedPrivacyLevel && options.includes(requestedPrivacyLevel)) {
    return requestedPrivacyLevel;
  }

  return options[0];
}

async function initPhotoPublish(connectionId: string, imageUrls: string[], caption?: string, options?: Record<string, unknown>) {
  const connection = await getTikTokConnectionCredentials(connectionId);
  const creatorInfo = await getTikTokCreatorInfo(connectionId);

  const initialized = await initPhotoPost({
    accessToken: connection.accessToken,
    autoAddMusic: typeof options?.auto_add_music === "boolean" ? options.auto_add_music : true,
    description: normalizeDescription(caption),
    disableComment: typeof options?.disable_comment === "boolean" ? options.disable_comment : creatorInfo.comment_disabled,
    photoCoverIndex: typeof options?.photo_cover_index === "number" ? options.photo_cover_index : 0,
    photoImages: imageUrls.slice(0, 35),
    privacyLevel: resolvePrivacyLevel(creatorInfo, typeof options?.privacy_level === "string" ? options.privacy_level : undefined),
    title: normalizeTitle(typeof options?.title === "string" ? options.title : caption),
  });

  return initialized.data.publish_id;
}

export const tiktokPublisher: PostingProvider = {
  platform: SocialPlatform.TIKTOK,
  async getStatus(publishJobId, connectionId) {
    const connection = await getTikTokConnectionCredentials(connectionId);
    const status = await fetchPostStatus(connection.accessToken, publishJobId);

    if (status.data.status === "FAILED") {
      return {
        error: status.data.fail_reason ?? status.error.message,
        status: "failed",
      };
    }

    if (status.data.status === "PUBLISH_COMPLETE") {
      const publicPostId = status.data.publicaly_available_post_id?.[0];
      return {
        externalId: publicPostId ? String(publicPostId) : publishJobId,
        status: "done",
      };
    }

    return {
      status: "pending",
    };
  },
  async publishCarousel(input) {
    return {
      externalId: await initPhotoPublish(input.connectionId, input.imageUrls, input.caption, input.options),
    };
  },
  async publishImage(input) {
    return {
      externalId: await initPhotoPublish(input.connectionId, [input.imageUrl], input.caption, input.options),
    };
  },
};
