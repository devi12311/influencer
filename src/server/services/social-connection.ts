import { Prisma, PublicationStatus, SocialPlatform } from "@prisma/client";
import { open, seal } from "@/server/crypto/vault";
import { db } from "@/server/db";

export interface UpsertConnectionInput {
  accessExpiresAt?: Date | null;
  accessToken: string;
  externalAccountId: string;
  meta?: Record<string, unknown> | null;
  platform: SocialPlatform;
  refreshExpiresAt?: Date | null;
  refreshToken?: string | null;
  scopes: string[];
  userId: string;
}

export async function upsertConnection(input: UpsertConnectionInput) {
  return db.socialConnection.upsert({
    where: {
      userId_platform_externalAccountId: {
        externalAccountId: input.externalAccountId,
        platform: input.platform,
        userId: input.userId,
      },
    },
    update: {
      accessExpiresAt: input.accessExpiresAt,
      accessTokenCt: seal(input.accessToken, input.userId),
      lastRefreshedAt: new Date(),
      meta: (input.meta as Prisma.InputJsonValue | null | undefined) ?? undefined,
      refreshExpiresAt: input.refreshExpiresAt,
      refreshTokenCt: input.refreshToken ? seal(input.refreshToken, input.userId) : null,
      scopes: input.scopes,
      status: "active",
    },
    create: {
      accessExpiresAt: input.accessExpiresAt,
      accessTokenCt: seal(input.accessToken, input.userId),
      externalAccountId: input.externalAccountId,
      meta: (input.meta as Prisma.InputJsonValue | null | undefined) ?? undefined,
      platform: input.platform,
      refreshExpiresAt: input.refreshExpiresAt,
      refreshTokenCt: input.refreshToken ? seal(input.refreshToken, input.userId) : null,
      scopes: input.scopes,
      userId: input.userId,
    },
  });
}

export async function getDecryptedTokens(connectionId: string) {
  const connection = await db.socialConnection.findUniqueOrThrow({
    where: { id: connectionId },
    select: {
      accessTokenCt: true,
      refreshTokenCt: true,
      userId: true,
    },
  });

  return {
    accessToken: open(connection.accessTokenCt, connection.userId),
    refreshToken: connection.refreshTokenCt ? open(connection.refreshTokenCt, connection.userId) : undefined,
  };
}

export async function listConnections(userId: string) {
  return db.socialConnection.findMany({
    where: { userId },
    orderBy: [{ platform: "asc" }, { connectedAt: "desc" }],
    select: {
      avatarUrl: true,
      connectedAt: true,
      displayName: true,
      externalAccountId: true,
      id: true,
      lastRefreshedAt: true,
      platform: true,
      scopes: true,
      status: true,
    },
  });
}

export async function markNeedsReauth(connectionId: string, reason: string) {
  return db.socialConnection.update({
    where: { id: connectionId },
    data: {
      meta: { reauthReason: reason } as Prisma.InputJsonValue,
      status: "needs_reauth",
    },
  });
}

export async function deleteConnection(connectionId: string, userId: string) {
  await db.postPublication.updateMany({
    where: {
      socialConnectionId: connectionId,
      status: {
        in: [PublicationStatus.DRAFT, PublicationStatus.SCHEDULED, PublicationStatus.PUBLISHING],
      },
    },
    data: {
      errorMessage: "Connection revoked by the user.",
      status: PublicationStatus.FAILED,
    },
  });

  return db.socialConnection.update({
    where: {
      id: connectionId,
      userId,
    },
    data: {
      status: "revoked",
    },
  });
}
