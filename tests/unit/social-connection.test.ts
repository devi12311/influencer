import { SocialPlatform } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = {
  postPublication: {
    updateMany: vi.fn(),
  },
  socialConnection: {
    findFirstOrThrow: vi.fn(),
    findMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
};

vi.mock("@/server/db", () => ({ db: dbMock }));
vi.mock("@/server/crypto/vault", () => ({
  open: vi.fn((value: string) => `open:${value}`),
  seal: vi.fn((value: string) => `seal:${value}`),
}));

let service: typeof import("@/server/services/social-connection");

beforeEach(async () => {
  vi.clearAllMocks();
  service = await import("@/server/services/social-connection");
});

describe("social connection service", () => {
  it("encrypts tokens when upserting connections", async () => {
    dbMock.socialConnection.upsert.mockResolvedValue({ id: "connection-1" });

    await service.upsertConnection({
      accessToken: "access-token",
      externalAccountId: "external-1",
      platform: SocialPlatform.INSTAGRAM,
      scopes: ["basic"],
      userId: "user-1",
    });

    expect(dbMock.socialConnection.upsert).toHaveBeenCalled();
  });

  it("decrypts stored tokens", async () => {
    dbMock.socialConnection.findUniqueOrThrow.mockResolvedValue({
      accessTokenCt: "encrypted-access",
      refreshTokenCt: "encrypted-refresh",
      userId: "user-1",
    });

    await expect(service.getDecryptedTokens("connection-1")).resolves.toEqual({
      accessToken: "open:encrypted-access",
      refreshToken: "open:encrypted-refresh",
    });
  });

  it("marks active publications as failed when revoking a connection", async () => {
    dbMock.postPublication.updateMany.mockResolvedValue({ count: 2 });
    dbMock.socialConnection.findFirstOrThrow.mockResolvedValue({ id: "connection-1", userId: "user-1" });
    dbMock.socialConnection.update.mockResolvedValue({ id: "connection-1", status: "revoked" });

    await service.deleteConnection("connection-1", "user-1");

    expect(dbMock.postPublication.updateMany).toHaveBeenCalled();
    expect(dbMock.socialConnection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "revoked" },
      }),
    );
  });
});
