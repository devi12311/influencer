import { NextResponse } from "next/server";
import { SocialPlatform } from "@prisma/client";
import { getInstagramAccount } from "@/server/providers/instagram/client";
import { exchangeCode, exchangeForLongLived, getInstagramScopes } from "@/server/providers/instagram/oauth";
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
    return NextResponse.redirect(new URL("/settings/connections?error=missing_instagram_callback_params", request.url));
  }

  try {
    const oauthState = await consumeState(state);

    if (oauthState.platform !== SocialPlatform.INSTAGRAM) {
      throw new Error("OAuth state did not match the Instagram platform.");
    }

    const shortLived = await exchangeCode(code);
    const longLived = await exchangeForLongLived(shortLived.access_token);
    const instagramAccount = await getInstagramAccount(longLived.access_token);
    const expiresAt = new Date(Date.now() + longLived.expires_in * 1000);

    const externalAccountId = String(instagramAccount.user_id ?? instagramAccount.id ?? shortLived.user_id);

    await upsertConnection({
      accessExpiresAt: expiresAt,
      accessToken: longLived.access_token,
      avatarUrl: instagramAccount.profile_picture_url ?? null,
      displayName: instagramAccount.username ?? instagramAccount.name ?? null,
      externalAccountId,
      meta: {
        account: instagramAccount,
        tokenType: longLived.token_type ?? null,
      },
      platform: SocialPlatform.INSTAGRAM,
      scopes: shortLived.permissions ?? getInstagramScopes(),
      userId: oauthState.userId,
    });

    return NextResponse.redirect(new URL("/settings/connections?connected=instagram", request.url));
  } catch (caughtError) {
    const errorMessage = caughtError instanceof Error ? caughtError.message : "instagram_callback_failed";
    return NextResponse.redirect(
      new URL(`/settings/connections?error=${encodeURIComponent(errorMessage)}`, request.url),
    );
  }
}
