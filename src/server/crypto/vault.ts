import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/server/env";

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getMasterKey() {
  const key = Buffer.from(env.MASTER_KEY, "base64");

  if (key.length !== 32) {
    throw new Error("MASTER_KEY must decode to 32 bytes.");
  }

  return key;
}

function getContextBuffer(context?: string) {
  return Buffer.from(context ?? "default", "utf8");
}

export function seal(plaintext: string, context?: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getMasterKey(), iv);
  cipher.setAAD(getContextBuffer(context));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, ciphertext, tag]).toString("base64");
}

export function open(sealed: string, context?: string) {
  const buffer = Buffer.from(sealed, "base64");
  const iv = buffer.subarray(0, IV_LENGTH);
  const tag = buffer.subarray(buffer.length - TAG_LENGTH);
  const ciphertext = buffer.subarray(IV_LENGTH, buffer.length - TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", getMasterKey(), iv);
  decipher.setAAD(getContextBuffer(context));
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
