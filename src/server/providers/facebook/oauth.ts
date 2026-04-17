import { env } from "@/server/env";
import {
  exchangeCodeForUserToken,
  exchangeForLongLivedUserToken,
  listManagedPages,
  verifyPageToken,
} from "@/server/providers/facebook/client";

const facebookScopes = ["pages_show_list", "pages_manage_posts", "pages_read_engagement"] as const;

export function buildAuthorizeUrl(state: string) {
  const query = new URLSearchParams({
    client_id: env.FACEBOOK_APP_ID ?? "",
    redirect_uri: env.FACEBOOK_REDIRECT_URI,
    response_type: "code",
    scope: facebookScopes.join(","),
    state,
  });

  return `https://www.facebook.com/v21.0/dialog/oauth?${query.toString()}`;
}

export async function exchangeCode(code: string) {
  return exchangeCodeForUserToken({
    clientId: env.FACEBOOK_APP_ID ?? "",
    clientSecret: env.FACEBOOK_APP_SECRET ?? "",
    code,
    redirectUri: env.FACEBOOK_REDIRECT_URI,
  });
}

export async function exchangeForLongLived(shortUserToken: string) {
  return exchangeForLongLivedUserToken({
    clientId: env.FACEBOOK_APP_ID ?? "",
    clientSecret: env.FACEBOOK_APP_SECRET ?? "",
    shortUserToken,
  });
}

export async function listPages(longLivedUserToken: string) {
  return listManagedPages(longLivedUserToken);
}

export async function refresh(pageToken: string) {
  return verifyPageToken(pageToken);
}

export function getFacebookScopes() {
  return [...facebookScopes];
}
