import { SocialPlatform } from "@prisma/client";
import { refresh as refreshInstagramToken } from "@/server/providers/instagram/oauth";
import { getQueue, queueNames } from "@/server/queue/queues";
import { db } from "@/server/db";
import { getDecryptedTokens, markNeedsReauth, upsertConnection } from "@/server/services/social-connection";
import { logger } from "@/server/logger";

export const REFRESH_SCAN_SENTINEL = "__scan__";
const REFRESH_SCAN_JOB_ID = "refresh-token-scan";

interface RefreshJobData {
  connectionId: string;
}

async function refreshProviderTokens(platform: SocialPlatform, connectionId: string) {
  if (platform !== SocialPlatform.INSTAGRAM) {
    throw new Error(`Refresh handling for ${platform} is not implemented yet.`);
  }

  const connection = await db.socialConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });
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

  logger.info({ connectionId, platform }, "Refreshed provider access token");
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
