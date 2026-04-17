import { SocialPlatform } from "@prisma/client";
import { facebookPublisher } from "@/server/providers/facebook/publisher";
import { instagramPublisher } from "@/server/providers/instagram/publisher";
import type { PostingProvider } from "@/server/providers/posting-provider";
import { threadsPublisher } from "@/server/providers/threads/publisher";

const postingProviders = new Map<SocialPlatform, PostingProvider>([
  [SocialPlatform.INSTAGRAM, instagramPublisher],
  [SocialPlatform.FACEBOOK_PAGE, facebookPublisher],
  [SocialPlatform.THREADS, threadsPublisher],
]);

export function resolvePostingProvider(platform: SocialPlatform) {
  const provider = postingProviders.get(platform);

  if (!provider) {
    throw new Error(`No posting provider registered for ${platform}.`);
  }

  return provider;
}
