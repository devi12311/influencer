import { NextResponse } from "next/server";
import { SocialPlatform } from "@prisma/client";
import { getThreadsProfile } from "@/server/providers/threads/client";
import { exchangeCode, exchangeForLongLived, getThreadsScopes } from "@/server/providers/threads/oauth";
import { consumeState } from "@/server/providers/oauth-state";
import { upsertConnection } from "@/server/services/social-connection";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  if (error) {
    return NextResponse.redirect(new URL(`/settings/connections?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings/connections?error=missing_threads_callback_params", request.url));
  }

  try {
    const oauthState = await consumeState(state);

    if (oauthState.platform !== SocialPlatform.THREADS) {
      throw new Error("OAuth state did not match the Threads platform.");
    }

    const shortLived = await exchangeCode(code);
    const longLived = await exchangeForLongLived(shortLived.access_token);
    const profile = await getThreadsProfile(longLived.access_token);
    const expiresAt = new Date(Date.now() + longLived.expires_in * 1000);
    const externalAccountId = String(profile.id ?? shortLived.user_id);

    await upsertConnection({
      accessExpiresAt: expiresAt,
      accessToken: longLived.access_token,
      avatarUrl: profile.threads_profile_picture_url ?? null,
      displayName: profile.username ?? profile.name ?? null,
      externalAccountId,
      meta: {
        profile,
        tokenType: longLived.token_type ?? null,
      },
      platform: SocialPlatform.THREADS,
      scopes: getThreadsScopes(),
      userId: oauthState.userId,
    });

    return NextResponse.redirect(new URL("/settings/connections?connected=threads", request.url));
  } catch (caughtError) {
    const errorMessage = caughtError instanceof Error ? caughtError.message : "threads_callback_failed";
    return NextResponse.redirect(
      new URL(`/settings/connections?error=${encodeURIComponent(errorMessage)}`, request.url),
    );
  }
}
