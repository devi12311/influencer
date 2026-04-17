import { SocialPlatform } from "@prisma/client";
import { getQueue, queueNames } from "@/server/queue/queues";
import { db } from "@/server/db";
import { getDecryptedTokens, markNeedsReauth } from "@/server/services/social-connection";
import { logger } from "@/server/logger";

export const REFRESH_SCAN_SENTINEL = "__scan__";
const REFRESH_SCAN_JOB_ID = "refresh-token-scan";

interface RefreshJobData {
  connectionId: string;
}

async function refreshProviderTokens(platform: SocialPlatform, connectionId: string) {
  const tokens = await getDecryptedTokens(connectionId);

  logger.info({ connectionId, hasRefreshToken: Boolean(tokens.refreshToken), platform }, "Refresh token stub invoked");

  throw new Error(`Refresh handling for ${platform} is not implemented yet.`);
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
