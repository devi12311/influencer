import { SocialPlatform } from "@prisma/client";
import { refresh as refreshFacebookPageToken } from "@/server/providers/facebook/oauth";
import { refresh as refreshInstagramToken } from "@/server/providers/instagram/oauth";
import { refresh as refreshThreadsToken } from "@/server/providers/threads/oauth";
import { db } from "@/server/db";
import { logger } from "@/server/logger";
import { getQueue, queueNames } from "@/server/queue/queues";
import { getDecryptedTokens, markNeedsReauth, upsertConnection } from "@/server/services/social-connection";

export const REFRESH_SCAN_SENTINEL = "__scan__";
const REFRESH_SCAN_JOB_ID = "refresh-token-scan";

interface RefreshJobData {
  connectionId: string;
}

async function refreshInstagramConnection(connectionId: string) {
  const connection = await db.socialConnection.findUniqueOrThrow({ where: { id: connectionId } });
  const tokens = await getDecryptedTokens(connectionId);
  const refreshed = await refreshInstagramToken(tokens.accessToken);

  await upsertConnection({
    accessExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    accessToken: refreshed.access_token,
    avatarUrl: connection.avatarUrl,
    displayName: connection.displayName,
    externalAccountId: connection.externalAccountId,
    meta: (connection.meta as Record<string, unknown> | null | undefined) ?? undefined,
    platform: connection.platform,
    refreshExpiresAt: connection.refreshExpiresAt,
    refreshToken: tokens.refreshToken,
    scopes: connection.scopes,
    userId: connection.userId,
  });
}

async function refreshFacebookConnection(connectionId: string) {
  const connection = await db.socialConnection.findUniqueOrThrow({ where: { id: connectionId } });
  const tokens = await getDecryptedTokens(connectionId);
  const verified = await refreshFacebookPageToken(tokens.accessToken);

  await upsertConnection({
    accessExpiresAt: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000),
    accessToken: tokens.accessToken,
    avatarUrl: connection.avatarUrl,
    displayName: verified.name ?? connection.displayName,
    externalAccountId: connection.externalAccountId,
    meta: {
      ...(connection.meta as Record<string, unknown> | null | undefined),
      lastVerifiedPageId: verified.id ?? null,
    },
    platform: connection.platform,
    refreshExpiresAt: connection.refreshExpiresAt,
    refreshToken: tokens.refreshToken,
    scopes: connection.scopes,
    userId: connection.userId,
  });
}

async function refreshThreadsConnection(connectionId: string) {
  const connection = await db.socialConnection.findUniqueOrThrow({ where: { id: connectionId } });
  const tokens = await getDecryptedTokens(connectionId);
  const refreshed = await refreshThreadsToken(tokens.accessToken);

  await upsertConnection({
    accessExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    accessToken: refreshed.access_token,
    avatarUrl: connection.avatarUrl,
    displayName: connection.displayName,
    externalAccountId: connection.externalAccountId,
    meta: (connection.meta as Record<string, unknown> | null | undefined) ?? undefined,
    platform: connection.platform,
    refreshExpiresAt: connection.refreshExpiresAt,
    refreshToken: tokens.refreshToken,
    scopes: connection.scopes,
    userId: connection.userId,
  });
}

async function refreshProviderTokens(platform: SocialPlatform, connectionId: string) {
  switch (platform) {
    case SocialPlatform.INSTAGRAM:
      await refreshInstagramConnection(connectionId);
      return;
    case SocialPlatform.FACEBOOK_PAGE:
      await refreshFacebookConnection(connectionId);
      return;
    case SocialPlatform.THREADS:
      await refreshThreadsConnection(connectionId);
      return;
    default:
      throw new Error(`Refresh handling for ${platform} is not implemented yet.`);
  }
}

export async function enqueueRefreshScanJob() {
  await getQueue(queueNames.refreshToken).upsertJobScheduler(
    REFRESH_SCAN_JOB_ID,
    { every: 30 * 60 * 1000 },
    {
      data: { connectionId: REFRESH_SCAN_SENTINEL },
      name: REFRESH_SCAN_JOB_ID,
    },
  );
}

export async function scanConnectionsNeedingRefresh() {
  const expiringConnections = await db.socialConnection.findMany({
    where: {
      accessExpiresAt: {
        lte: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
      status: "active",
    },
    select: { id: true },
  });

  const queue = getQueue(queueNames.refreshToken);
  await Promise.all(
    expiringConnections.map((connection) =>
      queue.add("refresh-token", { connectionId: connection.id }, { attempts: 3, backoff: { type: "exponential", delay: 5000 } }),
    ),
  );

  return expiringConnections.length;
}

export async function runRefreshTokenJob(data: RefreshJobData) {
  if (data.connectionId === REFRESH_SCAN_SENTINEL) {
    const count = await scanConnectionsNeedingRefresh();
    logger.info({ count }, "Scanned connections for token refresh");
    return { enqueued: count };
  }

  const connection = await db.socialConnection.findUniqueOrThrow({
    where: { id: data.connectionId },
    select: {
      id: true,
      platform: true,
    },
  });

  try {
    await refreshProviderTokens(connection.platform, connection.id);
    return { refreshed: true };
  } catch (error) {
    await markNeedsReauth(connection.id, error instanceof Error ? error.message : "Refresh failed.");
    throw error;
  }
}
