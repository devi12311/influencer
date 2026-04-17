const MAX_ATTEMPTS = 5;
export const AUTH_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

export interface RateLimitStore {
  del(...keys: string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  get(key: string): Promise<string | null>;
  incr(key: string): Promise<number>;
}

export interface AuthRateLimitIdentity {
  ipAddress?: string | null;
  username: string;
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function buildKeys(identity: AuthRateLimitIdentity) {
  const usernameKey = `auth:login:username:${normalizeUsername(identity.username)}`;

  if (!identity.ipAddress) {
    return [usernameKey];
  }

  return [usernameKey, `auth:login:ip:${identity.ipAddress}`];
}

async function readCount(store: RateLimitStore, key: string) {
  const rawCount = await store.get(key);
  return rawCount ? Number(rawCount) : 0;
}

export async function isRateLimited(store: RateLimitStore, identity: AuthRateLimitIdentity) {
  const counts = await Promise.all(buildKeys(identity).map((key) => readCount(store, key)));
  return counts.some((count) => count >= MAX_ATTEMPTS);
}

export async function recordFailedSignIn(store: RateLimitStore, identity: AuthRateLimitIdentity) {
  const counts = await Promise.all(
    buildKeys(identity).map(async (key) => {
      const count = await store.incr(key);

      if (count === 1) {
        await store.expire(key, AUTH_RATE_LIMIT_WINDOW_SECONDS);
      }

      return count;
    }),
  );

  return counts.some((count) => count >= MAX_ATTEMPTS);
}

export async function clearFailedSignIns(store: RateLimitStore, identity: AuthRateLimitIdentity) {
  const keys = buildKeys(identity);
  await store.del(...keys);
}
