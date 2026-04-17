import { randomUUID } from "node:crypto";
import { getRedisConnection } from "@/server/queue/connection";

const FACEBOOK_PAGE_SELECTION_TTL_SECONDS = 10 * 60;

export interface PendingFacebookPage {
  accessToken: string;
  avatarUrl?: string | null;
  category?: string | null;
  id: string;
  name: string;
}

export async function createPendingFacebookPagesSelection(input: {
  pages: PendingFacebookPage[];
  userId: string;
}) {
  const token = randomUUID();
  const redis = getRedisConnection();

  await redis.set(
    `facebook:page-selection:${token}`,
    JSON.stringify({ pages: input.pages, userId: input.userId }),
    "EX",
    FACEBOOK_PAGE_SELECTION_TTL_SECONDS,
  );

  return token;
}

export async function getPendingFacebookPagesSelection(token: string) {
  const redis = getRedisConnection();
  const stored = await redis.get(`facebook:page-selection:${token}`);

  if (!stored) {
    return null;
  }

  return JSON.parse(stored) as {
    pages: PendingFacebookPage[];
    userId: string;
  };
}

export async function consumePendingFacebookPagesSelection(token: string) {
  const redis = getRedisConnection();
  const key = `facebook:page-selection:${token}`;
  const stored = await redis.get(key);

  if (!stored) {
    throw new Error("Facebook page selection has expired.");
  }

  await redis.del(key);
  return JSON.parse(stored) as {
    pages: PendingFacebookPage[];
    userId: string;
  };
}
