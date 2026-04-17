import { Prisma, PublicationStatus, SocialPlatform } from "@prisma/client";
import { open, seal } from "@/server/crypto/vault";
import { db } from "@/server/db";

export interface UpsertConnectionInput {
  accessExpiresAt?: Date | null;
  accessToken: string;
  avatarUrl?: string | null;
  displayName?: string | null;
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
      avatarUrl: input.avatarUrl,
      displayName: input.displayName,
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
      avatarUrl: input.avatarUrl,
      displayName: input.displayName,
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

export async function getInstagramConnectionCredentials(connectionId: string) {
  const connection = await db.socialConnection.findUniqueOrThrow({
    where: { id: connectionId },
    select: {
      externalAccountId: true,
      id: true,
      platform: true,
      userId: true,
      accessTokenCt: true,
      refreshTokenCt: true,
    },
  });

  if (connection.platform !== SocialPlatform.INSTAGRAM) {
    throw new Error("Connection is not an Instagram connection.");
  }

  return {
    accessToken: open(connection.accessTokenCt, connection.userId),
    connectionId: connection.id,
    externalAccountId: connection.externalAccountId,
    refreshToken: connection.refreshTokenCt ? open(connection.refreshTokenCt, connection.userId) : undefined,
  };
}

export async function getFacebookPageConnectionCredentials(connectionId: string) {
  const connection = await db.socialConnection.findUniqueOrThrow({
    where: { id: connectionId },
    select: {
      externalAccountId: true,
      id: true,
      platform: true,
      userId: true,
      accessTokenCt: true,
    },
  });

  if (connection.platform !== SocialPlatform.FACEBOOK_PAGE) {
    throw new Error("Connection is not a Facebook Page connection.");
  }

  return {
    accessToken: open(connection.accessTokenCt, connection.userId),
    connectionId: connection.id,
    externalAccountId: connection.externalAccountId,
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
      meta: true,
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
  const connection = await db.socialConnection.findFirstOrThrow({
    where: { id: connectionId, userId },
  });

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
    where: { id: connection.id },
    data: {
      status: "revoked",
    },
  });
}
