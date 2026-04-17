import { SocialPlatform } from "@prisma/client";
import type { PostingProvider } from "@/server/providers/posting-provider";
import { instagramPublisher } from "@/server/providers/instagram/publisher";

const postingProviders = new Map<SocialPlatform, PostingProvider>([[SocialPlatform.INSTAGRAM, instagramPublisher]]);

export function resolvePostingProvider(platform: SocialPlatform) {
  const provider = postingProviders.get(platform);

  if (!provider) {
    throw new Error(`No posting provider registered for ${platform}.`);
  }

  return provider;
}
