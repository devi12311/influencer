import { NextResponse } from "next/server";
import { SocialPlatform } from "@prisma/client";
import { exchangeCode, getTikTokScopes } from "@/server/providers/tiktok/oauth";
import { queryCreatorInfo } from "@/server/providers/tiktok/client";
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
    return NextResponse.redirect(new URL("/settings/connections?error=missing_tiktok_callback_params", request.url));
  }

  try {
    const oauthState = await consumeState(state);

    if (oauthState.platform !== SocialPlatform.TIKTOK) {
      throw new Error("OAuth state did not match the TikTok platform.");
    }

    const token = await exchangeCode({ code, codeVerifier: oauthState.codeVerifier });
    const creatorInfo = await queryCreatorInfo(token.access_token);

    await upsertConnection({
      accessExpiresAt: new Date(Date.now() + token.expires_in * 1000),
      accessToken: token.access_token,
      avatarUrl: creatorInfo.data.creator_avatar_url ?? null,
      displayName: creatorInfo.data.creator_username ?? creatorInfo.data.creator_nickname ?? null,
      externalAccountId: token.open_id,
      meta: {
        creatorInfo: creatorInfo.data,
        tokenType: token.token_type,
        unauditedClientNotice: true,
      },
      platform: SocialPlatform.TIKTOK,
      refreshExpiresAt: new Date(Date.now() + token.refresh_expires_in * 1000),
      refreshToken: token.refresh_token,
      scopes: getTikTokScopes(),
      userId: oauthState.userId,
    });

    return NextResponse.redirect(new URL("/settings/connections?connected=tiktok", request.url));
  } catch (caughtError) {
    const errorMessage = caughtError instanceof Error ? caughtError.message : "tiktok_callback_failed";
    return NextResponse.redirect(
      new URL(`/settings/connections?error=${encodeURIComponent(errorMessage)}`, request.url),
    );
  }
}
