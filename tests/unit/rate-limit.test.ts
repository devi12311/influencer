import { describe, expect, it } from "vitest";
import {
  AUTH_RATE_LIMIT_WINDOW_SECONDS,
  clearFailedSignIns,
  isRateLimited,
  recordFailedSignIn,
  type RateLimitStore,
} from "@/server/auth/rate-limit";

class FakeRateLimitStore implements RateLimitStore {
  private readonly values = new Map<string, number>();
  readonly expirations = new Map<string, number>();

  async del(...keys: string[]) {
    let deleted = 0;
    for (const key of keys) {
      if (this.values.delete(key)) {
        deleted += 1;
      }
      this.expirations.delete(key);
    }
    return deleted;
  }

  async expire(key: string, seconds: number) {
    this.expirations.set(key, seconds);
    return 1;
  }

  async get(key: string) {
    const value = this.values.get(key);
    return value === undefined ? null : String(value);
  }

  async incr(key: string) {
    const nextValue = (this.values.get(key) ?? 0) + 1;
    this.values.set(key, nextValue);
    return nextValue;
  }
}

describe("auth rate limiter", () => {
  it("blocks after five failed attempts by username or ip", async () => {
    const store = new FakeRateLimitStore();
    const identity = { ipAddress: "127.0.0.1", username: "creator" };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await recordFailedSignIn(store, identity);
    }

    await expect(isRateLimited(store, identity)).resolves.toBe(true);
    expect(store.expirations.get("auth:login:username:creator")).toBe(AUTH_RATE_LIMIT_WINDOW_SECONDS);
  });

  it("clears counters after a successful login", async () => {
    const store = new FakeRateLimitStore();
    const identity = { ipAddress: "127.0.0.1", username: "creator" };

    await recordFailedSignIn(store, identity);
    await clearFailedSignIns(store, identity);

    await expect(isRateLimited(store, identity)).resolves.toBe(false);
  });
});
