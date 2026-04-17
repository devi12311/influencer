import { NextResponse } from "next/server";
import { SocialPlatform } from "@prisma/client";
import { createPendingFacebookPagesSelection } from "@/server/providers/facebook/pending-pages";
import { exchangeCode, exchangeForLongLived, listPages } from "@/server/providers/facebook/oauth";
import { consumeState } from "@/server/providers/oauth-state";

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
    return NextResponse.redirect(new URL("/settings/connections?error=missing_facebook_callback_params", request.url));
  }

  try {
    const oauthState = await consumeState(state);

    if (oauthState.platform !== SocialPlatform.FACEBOOK_PAGE) {
      throw new Error("OAuth state did not match the Facebook platform.");
    }

    const shortLived = await exchangeCode(code);
    const longLived = await exchangeForLongLived(shortLived.access_token);
    const pages = await listPages(longLived.access_token);
    const token = await createPendingFacebookPagesSelection({
      pages: pages.data.map((page) => ({
        accessToken: page.access_token,
        avatarUrl: page.picture?.data.url ?? null,
        category: page.category ?? null,
        id: page.id,
        name: page.name,
      })),
      userId: oauthState.userId,
    });

    return NextResponse.redirect(new URL(`/settings/connections/facebook/select?token=${token}`, request.url));
  } catch (caughtError) {
    const errorMessage = caughtError instanceof Error ? caughtError.message : "facebook_callback_failed";
    return NextResponse.redirect(
      new URL(`/settings/connections?error=${encodeURIComponent(errorMessage)}`, request.url),
    );
  }
}
