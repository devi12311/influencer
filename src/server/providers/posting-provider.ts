import type { SocialPlatform } from "@prisma/client";

export interface PostingProvider {
  readonly platform: SocialPlatform;

  publishImage(input: {
    caption?: string;
    connectionId: string;
    imageUrl: string;
    options?: Record<string, unknown>;
  }): Promise<{ externalId: string }>;

  publishCarousel(input: {
    caption?: string;
    connectionId: string;
    imageUrls: string[];
    options?: Record<string, unknown>;
  }): Promise<{ externalId: string }>;

  getStatus?(publishJobId: string, connectionId: string): Promise<{
    error?: string;
    externalId?: string;
    status: "done" | "failed" | "pending";
  }>;
}
