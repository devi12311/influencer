import { getRedisConnection } from "@/server/queue/connection";

const TIKTOK_CREATOR_INFO_TTL_SECONDS = 10 * 60;

export async function getCachedTikTokCreatorInfo(connectionId: string) {
  const cached = await getRedisConnection().get(`tiktok:creator-info:${connectionId}`);
  return cached ? JSON.parse(cached) : null;
}

export async function setCachedTikTokCreatorInfo(connectionId: string, creatorInfo: unknown) {
  await getRedisConnection().set(
    `tiktok:creator-info:${connectionId}`,
    JSON.stringify(creatorInfo),
    "EX",
    TIKTOK_CREATOR_INFO_TTL_SECONDS,
  );
}
