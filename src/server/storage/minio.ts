import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/server/env";

const client = new S3Client({
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY,
    secretAccessKey: env.MINIO_SECRET_KEY,
  },
  endpoint: env.MINIO_ENDPOINT,
  forcePathStyle: true,
  region: env.MINIO_REGION,
});

function ensureBodyHasBytes(body: unknown) {
  if (body && typeof body === "object" && "transformToByteArray" in body) {
    return body as { transformToByteArray: () => Promise<Uint8Array> };
  }

  throw new Error("Object body is not readable as bytes.");
}

export function getStorageClient() {
  return client;
}

export async function ensureBucketExists() {
  try {
    await client.send(
      new HeadBucketCommand({
        Bucket: env.MINIO_BUCKET,
      }),
    );
  } catch (_error) {
    await client.send(
      new CreateBucketCommand({
        Bucket: env.MINIO_BUCKET,
      }),
    );
  }
}

export async function presignPut(key: string, contentType: string, ttl = 900) {
  await ensureBucketExists();

  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: env.MINIO_BUCKET,
      ContentType: contentType,
      Key: key,
    }),
    { expiresIn: ttl },
  );
}

export async function presignGet(key: string, ttl = 900) {
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
    }),
    { expiresIn: ttl },
  );
}

export async function headObject(key: string) {
  return client.send(
    new HeadObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
    }),
  );
}

export async function deleteObject(key: string) {
  return client.send(
    new DeleteObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
    }),
  );
}

export async function readObjectBytes(key: string, range?: string) {
  const response = await client.send(
    new GetObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
      Range: range,
    }),
  );

  const body = ensureBodyHasBytes(response.Body);
  return Buffer.from(await body.transformToByteArray());
}

export async function uploadObject(key: string, body: Buffer, contentType: string) {
  await ensureBucketExists();

  await client.send(
    new PutObjectCommand({
      Body: body,
      Bucket: env.MINIO_BUCKET,
      ContentType: contentType,
      Key: key,
    }),
  );
}

export function buildPublicUrl(key: string) {
  const baseUrl = env.MINIO_PUBLIC_BASE_URL.endsWith("/")
    ? env.MINIO_PUBLIC_BASE_URL.slice(0, -1)
    : env.MINIO_PUBLIC_BASE_URL;

  return `${baseUrl}/${env.MINIO_BUCKET}/${key}`;
}
