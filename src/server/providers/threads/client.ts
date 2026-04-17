import { z } from "zod";

const threadsGraphBaseUrl = "https://graph.threads.net/v1.0";
const threadsOauthBaseUrl = "https://graph.threads.net";
const threadsAuthorizeBaseUrl = "https://threads.net/oauth/authorize";

const shortTokenSchema = z.object({
  access_token: z.string(),
  user_id: z.union([z.string(), z.number()]),
});

const longLivedTokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  token_type: z.string().optional(),
});

const userProfileSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  threads_profile_picture_url: z.string().url().optional(),
  username: z.string().optional(),
});

const containerSchema = z.object({
  id: z.string(),
});

const publishSchema = z.object({
  id: z.string(),
});

const statusSchema = z.object({
  id: z.string().optional(),
  status: z.enum(["ERROR", "EXPIRED", "FINISHED", "IN_PROGRESS", "PUBLISHED"]),
});

async function parseResponse<T>(response: Response, schema: z.ZodSchema<T>) {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Threads API request failed (${response.status}): ${body}`);
  }

  return schema.parse(await response.json());
}

function buildThreadsUrl(path: string, query?: URLSearchParams) {
  return `${threadsGraphBaseUrl}${path}${query ? `?${query.toString()}` : ""}`;
}

function buildOauthUrl(path: string, query?: URLSearchParams) {
  return `${threadsOauthBaseUrl}${path}${query ? `?${query.toString()}` : ""}`;
}

export function buildThreadsAuthorizeUrl(query: URLSearchParams) {
  return `${threadsAuthorizeBaseUrl}?${query.toString()}`;
}

export async function exchangeCodeForShortLivedToken(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}) {
  const formData = new FormData();
  formData.set("client_id", input.clientId);
  formData.set("client_secret", input.clientSecret);
  formData.set("grant_type", "authorization_code");
  formData.set("redirect_uri", input.redirectUri);
  formData.set("code", input.code);

  const response = await fetch(`${threadsOauthBaseUrl}/oauth/access_token`, {
    body: formData,
    method: "POST",
  });

  return parseResponse(response, shortTokenSchema);
}

export async function exchangeForLongLivedToken(input: { accessToken: string; clientSecret: string }) {
  const query = new URLSearchParams({
    access_token: input.accessToken,
    client_secret: input.clientSecret,
    grant_type: "th_exchange_token",
  });

  const response = await fetch(buildOauthUrl("/access_token", query));
  return parseResponse(response, longLivedTokenSchema);
}

export async function refreshLongLivedToken(accessToken: string) {
  const query = new URLSearchParams({
    access_token: accessToken,
    grant_type: "th_refresh_token",
  });

  const response = await fetch(buildOauthUrl("/refresh_access_token", query));
  return parseResponse(response, longLivedTokenSchema);
}

export async function getThreadsProfile(accessToken: string) {
  const query = new URLSearchParams({
    access_token: accessToken,
    fields: "id,username,name,threads_profile_picture_url",
  });

  const response = await fetch(buildThreadsUrl("/me", query));
  return parseResponse(response, userProfileSchema);
}

export async function createThreadsContainer(input: {
  accessToken: string;
  children?: string[];
  imageUrl?: string;
  isCarouselItem?: boolean;
  mediaType?: "CAROUSEL" | "IMAGE";
  replyControl?: string;
  text?: string;
  userId: string;
}) {
  const formData = new URLSearchParams();
  formData.set("access_token", input.accessToken);
  if (input.mediaType) formData.set("media_type", input.mediaType);
  if (input.imageUrl) formData.set("image_url", input.imageUrl);
  if (input.text) formData.set("text", input.text);
  if (input.children?.length) formData.set("children", input.children.join(","));
  if (input.isCarouselItem) formData.set("is_carousel_item", "true");
  if (input.replyControl) formData.set("reply_control", input.replyControl);

  const response = await fetch(buildThreadsUrl(`/${input.userId}/threads`), {
    body: formData,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  return parseResponse(response, containerSchema);
}

export async function getThreadsContainerStatus(accessToken: string, containerId: string) {
  const query = new URLSearchParams({
    access_token: accessToken,
    fields: "status",
  });

  const response = await fetch(buildThreadsUrl(`/${containerId}`, query));
  return parseResponse(response, statusSchema);
}

export async function publishThreadsContainer(input: { accessToken: string; creationId: string; userId: string }) {
  const formData = new URLSearchParams();
  formData.set("access_token", input.accessToken);
  formData.set("creation_id", input.creationId);

  const response = await fetch(buildThreadsUrl(`/${input.userId}/threads_publish`), {
    body: formData,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  return parseResponse(response, publishSchema);
}
