"use server";

import { redirect } from "next/navigation";
import { SocialPlatform } from "@prisma/client";
import { auth } from "@/server/auth";
import { buildAuthorizeUrl } from "@/server/providers/instagram/oauth";
import { createState } from "@/server/providers/oauth-state";
import { getQueue, queueNames } from "@/server/queue/queues";
import { deleteConnection } from "@/server/services/social-connection";

export async function startInstagramConnection() {
  const session = await auth();

  if (!session?.userId) {
    redirect("/login?redirect=/settings/connections");
  }

  const { state } = await createState(session.userId, SocialPlatform.INSTAGRAM);
  redirect(buildAuthorizeUrl(state));
}

export async function disconnectConnection(connectionId: string) {
  const session = await auth();

  if (!session?.userId) {
    throw new Error("You must be signed in to disconnect a connection.");
  }

  await deleteConnection(connectionId, session.userId);
}

export async function forceRefreshConnection(connectionId: string) {
  await getQueue(queueNames.refreshToken).add(
    queueNames.refreshToken,
    { connectionId },
    {
      attempts: 1,
      removeOnComplete: true,
    },
  );
}
