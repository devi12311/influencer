export const REQUEST_ID_HEADER = "x-request-id";

export function getOrCreateRequestId(headers: Headers) {
  return headers.get(REQUEST_ID_HEADER) ?? globalThis.crypto.randomUUID();
}
