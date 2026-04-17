import { env } from "@/server/env";
import {
  buildThreadsAuthorizeUrl,
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  refreshLongLivedToken,
} from "@/server/providers/threads/client";

const threadsScopes = ["threads_basic", "threads_content_publish"] as const;

export function buildAuthorizeUrl(state: string) {
  const query = new URLSearchParams({
    client_id: env.THREADS_APP_ID ?? "",
    redirect_uri: env.THREADS_REDIRECT_URI,
    response_type: "code",
    scope: threadsScopes.join(","),
    state,
  });

  return buildThreadsAuthorizeUrl(query);
}

export async function exchangeCode(code: string) {
  return exchangeCodeForShortLivedToken({
    clientId: env.THREADS_APP_ID ?? "",
    clientSecret: env.THREADS_APP_SECRET ?? "",
    code,
    redirectUri: env.THREADS_REDIRECT_URI,
  });
}

export async function exchangeForLongLived(shortToken: string) {
  return exchangeForLongLivedToken({
    accessToken: shortToken,
    clientSecret: env.THREADS_APP_SECRET ?? "",
  });
}

export async function refresh(accessToken: string) {
  return refreshLongLivedToken(accessToken);
}

export function getThreadsScopes() {
  return [...threadsScopes];
}
