import { z } from "zod";

const facebookGraphBaseUrl = "https://graph.facebook.com/v21.0";

const userTokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number().optional(),
  token_type: z.string().optional(),
});

const pageSchema = z.object({
  access_token: z.string(),
  category: z.string().optional(),
  id: z.string(),
  name: z.string(),
  picture: z.object({ data: z.object({ url: z.string().url() }) }).optional(),
});

const pagesSchema = z.object({
  data: z.array(pageSchema),
});

const pagePublishSchema = z.object({
  id: z.string(),
  post_id: z.string().optional(),
});

const pageFeedSchema = z.object({
  id: z.string(),
});

const pageIdentitySchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
});

async function parseResponse<T>(response: Response, schema: z.ZodSchema<T>) {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Facebook API request failed (${response.status}): ${body}`);
  }

  return schema.parse(await response.json());
}

function buildGraphUrl(path: string, query?: URLSearchParams) {
  return `${facebookGraphBaseUrl}${path}${query ? `?${query.toString()}` : ""}`;
}

export async function exchangeCodeForUserToken(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}) {
  const query = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    code: input.code,
    redirect_uri: input.redirectUri,
  });

  const response = await fetch(buildGraphUrl("/oauth/access_token", query));
  return parseResponse(response, userTokenSchema);
}

export async function exchangeForLongLivedUserToken(input: {
  clientId: string;
  clientSecret: string;
  shortUserToken: string;
}) {
  const query = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    fb_exchange_token: input.shortUserToken,
    grant_type: "fb_exchange_token",
  });

  const response = await fetch(buildGraphUrl("/oauth/access_token", query));
  return parseResponse(response, userTokenSchema);
}

export async function listManagedPages(longLivedUserToken: string) {
  const query = new URLSearchParams({
    access_token: longLivedUserToken,
    fields: "id,name,access_token,category,picture{url}",
  });

  const response = await fetch(buildGraphUrl("/me/accounts", query));
  return parseResponse(response, pagesSchema);
}

export async function publishPagePhoto(input: {
  accessToken: string;
  caption?: string;
  pageId: string;
  published?: boolean;
  url: string;
}) {
  const response = await fetch(buildGraphUrl(`/${input.pageId}/photos`), {
    body: JSON.stringify({
      access_token: input.accessToken,
      caption: input.caption,
      published: input.published,
      url: input.url,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseResponse(response, pagePublishSchema);
}

export async function publishPageFeedPost(input: {
  accessToken: string;
  attachedMediaIds: string[];
  message?: string;
  pageId: string;
}) {
  const response = await fetch(buildGraphUrl(`/${input.pageId}/feed`), {
    body: JSON.stringify({
      access_token: input.accessToken,
      attached_media: input.attachedMediaIds.map((mediaId) => ({ media_fbid: mediaId })),
      message: input.message,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseResponse(response, pageFeedSchema);
}

export async function verifyPageToken(pageToken: string) {
  const query = new URLSearchParams({
    access_token: pageToken,
    fields: "id,name",
  });

  const response = await fetch(buildGraphUrl("/me", query));
  return parseResponse(response, pageIdentitySchema);
}
