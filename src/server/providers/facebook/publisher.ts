import { SocialPlatform } from "@prisma/client";
import type { PostingProvider } from "@/server/providers/posting-provider";
import { publishPageFeedPost, publishPagePhoto } from "@/server/providers/facebook/client";
import { getFacebookPageConnectionCredentials } from "@/server/services/social-connection";

async function publishSinglePhoto(connectionId: string, imageUrl: string, caption?: string) {
  const connection = await getFacebookPageConnectionCredentials(connectionId);
  const published = await publishPagePhoto({
    accessToken: connection.accessToken,
    caption,
    pageId: connection.externalAccountId,
    url: imageUrl,
  });

  return published.post_id ?? published.id;
}

async function publishMultiPhoto(connectionId: string, imageUrls: string[], caption?: string) {
  const connection = await getFacebookPageConnectionCredentials(connectionId);
  const photoIds: string[] = [];

  for (const imageUrl of imageUrls) {
    const unpublishedPhoto = await publishPagePhoto({
      accessToken: connection.accessToken,
      pageId: connection.externalAccountId,
      published: false,
      url: imageUrl,
    });

    photoIds.push(unpublishedPhoto.id);
  }

  const published = await publishPageFeedPost({
    accessToken: connection.accessToken,
    attachedMediaIds: photoIds,
    message: caption,
    pageId: connection.externalAccountId,
  });

  return published.id;
}

export const facebookPublisher: PostingProvider = {
  platform: SocialPlatform.FACEBOOK_PAGE,
  async publishCarousel(input) {
    return {
      externalId: await publishMultiPhoto(input.connectionId, input.imageUrls, input.caption),
    };
  },
  async publishImage(input) {
    return {
      externalId: await publishSinglePhoto(input.connectionId, input.imageUrl, input.caption),
    };
  },
};
