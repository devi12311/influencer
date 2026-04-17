import { z } from "zod";

const graphApiBaseUrl = "https://graph.instagram.com/v21.0";
const graphOauthBaseUrl = "https://graph.instagram.com";
const instagramOauthBaseUrl = "https://api.instagram.com";

const tokenExchangeSchema = z.object({
  access_token: z.string(),
  permissions: z.array(z.string()).optional(),
  user_id: z.union([z.number(), z.string()]),
});

const longLivedTokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  token_type: z.string().optional(),
});

const instagramAccountSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  profile_picture_url: z.string().url().optional(),
  user_id: z.union([z.number(), z.string()]).optional(),
  username: z.string().optional(),
});

const mediaContainerSchema = z.object({
  id: z.string(),
});

const statusSchema = z.object({
  id: z.string().optional(),
  status_code: z.enum(["ERROR", "EXPIRED", "FINISHED", "IN_PROGRESS", "PUBLISHED"]),
});

const publishSchema = z.object({
  id: z.string(),
});

const publishingLimitSchema = z.object({
  config: z.object({
    quota_total: z.number().optional(),
  }).optional(),
  data: z.array(z.unknown()).optional(),
  quota_usage: z.number().optional(),
});

async function parseResponse<T>(response: Response, schema: z.ZodSchema<T>) {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Instagram API request failed (${response.status}): ${body}`);
  }

  return schema.parse(await response.json());
}

function buildGraphUrl(path: string, query?: URLSearchParams) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${graphApiBaseUrl}${normalizedPath}${query ? `?${query.toString()}` : ""}`;
}

function buildOauthUrl(baseUrl: string, path: string, query?: URLSearchParams) {
  return `${baseUrl}${path}${query ? `?${query.toString()}` : ""}`;
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

  const response = await fetch(`${instagramOauthBaseUrl}/oauth/access_token`, {
    body: formData,
    method: "POST",
  });

  return parseResponse(response, tokenExchangeSchema);
}

export async function exchangeForLongLivedToken(input: { accessToken: string; clientSecret: string }) {
  const query = new URLSearchParams({
    access_token: input.accessToken,
    client_secret: input.clientSecret,
    grant_type: "ig_exchange_token",
  });

  const response = await fetch(buildOauthUrl(graphOauthBaseUrl, "/access_token", query));
  return parseResponse(response, longLivedTokenSchema);
}

export async function refreshLongLivedToken(accessToken: string) {
  const query = new URLSearchParams({
    access_token: accessToken,
    grant_type: "ig_refresh_token",
  });

  const response = await fetch(buildOauthUrl(graphOauthBaseUrl, "/refresh_access_token", query));
  return parseResponse(response, longLivedTokenSchema);
}

export async function getInstagramAccount(accessToken: string) {
  const query = new URLSearchParams({
    access_token: accessToken,
    fields: "id,user_id,username,name,profile_picture_url",
  });

  const response = await fetch(buildGraphUrl("/me", query), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseResponse(response, instagramAccountSchema);
}

export async function createMediaContainer(input: {
  accessToken: string;
  caption?: string;
  children?: string[];
  imageUrl?: string;
  isCarouselItem?: boolean;
  mediaType?: "CAROUSEL";
  userId: string;
}) {
  const response = await fetch(buildGraphUrl(`/${input.userId}/media`), {
    body: JSON.stringify({
      caption: input.caption,
      children: input.children?.join(","),
      image_url: input.imageUrl,
      is_carousel_item: input.isCarouselItem,
      media_type: input.mediaType,
    }),
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseResponse(response, mediaContainerSchema);
}

export async function getMediaContainerStatus(accessToken: string, creationId: string) {
  const query = new URLSearchParams({
    access_token: accessToken,
    fields: "status_code",
  });

  const response = await fetch(buildGraphUrl(`/${creationId}`, query), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseResponse(response, statusSchema);
}

export async function publishMediaContainer(input: { accessToken: string; creationId: string; userId: string }) {
  const response = await fetch(buildGraphUrl(`/${input.userId}/media_publish`), {
    body: JSON.stringify({ creation_id: input.creationId }),
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseResponse(response, publishSchema);
}

export async function getPublishingLimit(accessToken: string, userId: string) {
  const query = new URLSearchParams({
    access_token: accessToken,
    fields: "quota_usage,config",
  });

  const response = await fetch(buildGraphUrl(`/${userId}/content_publishing_limit`, query), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseResponse(response, publishingLimitSchema);
}
