import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/server/env";

const client = new S3Client({
  region: env.MINIO_REGION,
  endpoint: env.MINIO_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY,
    secretAccessKey: env.MINIO_SECRET_KEY,
  },
});

export function getStorageClient() {
  return client;
}

export async function presignPut(key: string, contentType: string, ttl = 900) {
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
      ContentType: contentType,
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

export function buildPublicUrl(key: string) {
  const baseUrl = env.MINIO_PUBLIC_BASE_URL.endsWith("/")
    ? env.MINIO_PUBLIC_BASE_URL.slice(0, -1)
    : env.MINIO_PUBLIC_BASE_URL;

  return `${baseUrl}/${env.MINIO_BUCKET}/${key}`;
}
