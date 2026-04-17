import { z } from "zod";

const tiktokApiBaseUrl = "https://open.tiktokapis.com/v2";
const tiktokAuthorizeBaseUrl = "https://www.tiktok.com/v2/auth/authorize/";

const tokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  open_id: z.string(),
  refresh_expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
  token_type: z.string(),
});

const creatorInfoSchema = z.object({
  data: z.object({
    comment_disabled: z.boolean().optional(),
    creator_avatar_url: z.string().url().optional(),
    creator_nickname: z.string().optional(),
    creator_username: z.string().optional(),
    duet_disabled: z.boolean().optional(),
    max_video_post_duration_sec: z.number().optional(),
    privacy_level_options: z.array(z.string()).optional(),
    stitch_disabled: z.boolean().optional(),
  }),
  error: z.object({
    code: z.string(),
    log_id: z.string().optional(),
    message: z.string(),
  }),
});

const initSchema = z.object({
  data: z.object({
    publish_id: z.string(),
    upload_url: z.string().optional(),
  }),
  error: z.object({
    code: z.string(),
    log_id: z.string().optional(),
    message: z.string(),
  }),
});

const statusSchema = z.object({
  data: z.object({
    downloaded_bytes: z.number().optional(),
    fail_reason: z.string().optional(),
    publicaly_available_post_id: z.array(z.union([z.number(), z.string()])).optional(),
    status: z.enum(["FAILED", "PROCESSING_DOWNLOAD", "PROCESSING_UPLOAD", "PUBLISH_COMPLETE", "SEND_TO_USER_INBOX"]),
    uploaded_bytes: z.number().optional(),
  }),
  error: z.object({
    code: z.string(),
    log_id: z.string().optional(),
    message: z.string(),
  }),
});

async function parseResponse<T>(response: Response, schema: z.ZodSchema<T>) {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`TikTok API request failed (${response.status}): ${body}`);
  }

  return schema.parse(await response.json());
}

function buildTikTokUrl(path: string) {
  return `${tiktokApiBaseUrl}${path}`;
}

export function buildTikTokAuthorizeUrl(query: URLSearchParams) {
  return `${tiktokAuthorizeBaseUrl}?${query.toString()}`;
}

export async function exchangeCodeForToken(input: {
  clientKey: string;
  clientSecret: string;
  code: string;
  codeVerifier?: string;
  grantType: "authorization_code" | "refresh_token";
  redirectUri?: string;
  refreshToken?: string;
}) {
  const body = new URLSearchParams({
    client_key: input.clientKey,
    client_secret: input.clientSecret,
    grant_type: input.grantType,
  });

  if (input.grantType === "authorization_code") {
    body.set("code", input.code);
    if (input.redirectUri) body.set("redirect_uri", input.redirectUri);
    if (input.codeVerifier) body.set("code_verifier", input.codeVerifier);
  }

  if (input.grantType === "refresh_token" && input.refreshToken) {
    body.set("refresh_token", input.refreshToken);
  }

  const response = await fetch(buildTikTokUrl("/oauth/token/"), {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  return parseResponse(response, tokenSchema);
}

export async function queryCreatorInfo(accessToken: string) {
  const response = await fetch(buildTikTokUrl("/post/publish/creator_info/query/"), {
    body: JSON.stringify({}),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    method: "POST",
  });

  return parseResponse(response, creatorInfoSchema);
}

export async function initPhotoPost(input: {
  accessToken: string;
  autoAddMusic?: boolean;
  description?: string;
  disableComment?: boolean;
  photoCoverIndex: number;
  photoImages: string[];
  privacyLevel: string;
  title?: string;
}) {
  const response = await fetch(buildTikTokUrl("/post/publish/content/init/"), {
    body: JSON.stringify({
      media_type: "PHOTO",
      post_info: {
        auto_add_music: input.autoAddMusic,
        description: input.description,
        disable_comment: input.disableComment,
        privacy_level: input.privacyLevel,
        title: input.title,
      },
      post_mode: "DIRECT_POST",
      source_info: {
        photo_cover_index: input.photoCoverIndex,
        photo_images: input.photoImages,
        source: "PULL_FROM_URL",
      },
    }),
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseResponse(response, initSchema);
}

export async function initVideoPost(input: {
  accessToken: string;
  description?: string;
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  privacyLevel: string;
  title?: string;
  videoUrl: string;
}) {
  const response = await fetch(buildTikTokUrl("/post/publish/video/init/"), {
    body: JSON.stringify({
      post_info: {
        disable_comment: input.disableComment,
        disable_duet: input.disableDuet,
        disable_stitch: input.disableStitch,
        privacy_level: input.privacyLevel,
        title: input.title ?? input.description,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: input.videoUrl,
      },
    }),
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseResponse(response, initSchema);
}

export async function fetchPostStatus(accessToken: string, publishId: string) {
  const response = await fetch(buildTikTokUrl("/post/publish/status/fetch/"), {
    body: JSON.stringify({ publish_id: publishId }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    method: "POST",
  });

  return parseResponse(response, statusSchema);
}
