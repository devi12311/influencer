import { env } from "@/server/env";
import {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  refreshLongLivedToken,
} from "@/server/providers/instagram/client";

const instagramScopes = ["instagram_business_basic", "instagram_business_content_publish"] as const;

export function buildAuthorizeUrl(state: string) {
  const query = new URLSearchParams({
    client_id: env.INSTAGRAM_CLIENT_ID ?? "",
    redirect_uri: env.INSTAGRAM_REDIRECT_URI,
    response_type: "code",
    scope: instagramScopes.join(","),
    state,
  });

  return `https://www.instagram.com/oauth/authorize?${query.toString()}`;
}

export async function exchangeCode(code: string) {
  return exchangeCodeForShortLivedToken({
    clientId: env.INSTAGRAM_CLIENT_ID ?? "",
    clientSecret: env.INSTAGRAM_CLIENT_SECRET ?? "",
    code,
    redirectUri: env.INSTAGRAM_REDIRECT_URI,
  });
}

export async function exchangeForLongLived(shortLivedToken: string) {
  return exchangeForLongLivedToken({
    accessToken: shortLivedToken,
    clientSecret: env.INSTAGRAM_CLIENT_SECRET ?? "",
  });
}

export async function refresh(accessToken: string) {
  return refreshLongLivedToken(accessToken);
}

export function getInstagramScopes() {
  return [...instagramScopes];
}
