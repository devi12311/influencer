import { env } from "@/server/env";
import { buildTikTokAuthorizeUrl, exchangeCodeForToken } from "@/server/providers/tiktok/client";

const tiktokScopes = ["user.info.basic", "video.publish"] as const;

export function buildAuthorizeUrl(input: { codeChallenge: string; state: string }) {
  const query = new URLSearchParams({
    client_key: env.TIKTOK_CLIENT_KEY ?? "",
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    redirect_uri: env.TIKTOK_REDIRECT_URI,
    response_type: "code",
    scope: tiktokScopes.join(","),
    state: input.state,
  });

  return buildTikTokAuthorizeUrl(query);
}

export async function exchangeCode(input: { code: string; codeVerifier: string }) {
  return exchangeCodeForToken({
    clientKey: env.TIKTOK_CLIENT_KEY ?? "",
    clientSecret: env.TIKTOK_CLIENT_SECRET ?? "",
    code: input.code,
    codeVerifier: input.codeVerifier,
    grantType: "authorization_code",
    redirectUri: env.TIKTOK_REDIRECT_URI,
  });
}

export async function refresh(refreshToken: string) {
  return exchangeCodeForToken({
    clientKey: env.TIKTOK_CLIENT_KEY ?? "",
    clientSecret: env.TIKTOK_CLIENT_SECRET ?? "",
    code: "",
    grantType: "refresh_token",
    refreshToken,
  });
}

export function getTikTokScopes() {
  return [...tiktokScopes];
}
