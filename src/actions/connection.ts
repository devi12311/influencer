"use server";

import { redirect } from "next/navigation";
import { SocialPlatform } from "@prisma/client";
import { auth } from "@/server/auth";
import { buildAuthorizeUrl as buildFacebookAuthorizeUrl, getFacebookScopes } from "@/server/providers/facebook/oauth";
import { consumePendingFacebookPagesSelection } from "@/server/providers/facebook/pending-pages";
import { buildAuthorizeUrl as buildInstagramAuthorizeUrl, getInstagramScopes } from "@/server/providers/instagram/oauth";
import { createState } from "@/server/providers/oauth-state";
import { getQueue, queueNames } from "@/server/queue/queues";
import { deleteConnection, upsertConnection } from "@/server/services/social-connection";

async function requireSessionUser() {
  const session = await auth();

  if (!session?.userId) {
    redirect("/login?redirect=/settings/connections");
  }

  return session.userId;
}

export async function startInstagramConnection() {
  const userId = await requireSessionUser();
  const { state } = await createState(userId, SocialPlatform.INSTAGRAM);
  redirect(buildInstagramAuthorizeUrl(state));
}

export async function startFacebookConnection() {
  const userId = await requireSessionUser();
  const { state } = await createState(userId, SocialPlatform.FACEBOOK_PAGE);
  redirect(buildFacebookAuthorizeUrl(state));
}

export async function connectSelectedFacebookPages(formData: FormData) {
  const currentUserId = await requireSessionUser();
  const token = formData.get("token");
  const selectedPageIds = formData.getAll("pageIds").filter((value): value is string => typeof value === "string");

  if (typeof token !== "string" || selectedPageIds.length === 0) {
    redirect("/settings/connections?error=select_at_least_one_facebook_page");
  }

  const selection = await consumePendingFacebookPagesSelection(token);

  if (selection.userId !== currentUserId) {
    redirect("/settings/connections?error=facebook_page_selection_user_mismatch");
  }

  const scopes = getFacebookScopes();

  for (const page of selection.pages) {
    if (!selectedPageIds.includes(page.id)) {
      continue;
    }

    await upsertConnection({
      accessExpiresAt: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000),
      accessToken: page.accessToken,
      avatarUrl: page.avatarUrl ?? null,
      displayName: page.name,
      externalAccountId: page.id,
      meta: {
        category: page.category ?? null,
        source: "facebook_page_oauth",
      },
      platform: SocialPlatform.FACEBOOK_PAGE,
      scopes,
      userId: currentUserId,
    });
  }

  redirect("/settings/connections?connected=facebook_page");
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

export async function publishConnectionPost(publicationId: string) {
  await getQueue(queueNames.publishPost).add(
    queueNames.publishPost,
    { publicationId },
    {
      attempts: 3,
      backoff: {
        delay: 5_000,
        type: "exponential",
      },
    },
  );
}
