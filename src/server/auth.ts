import type { Adapter } from "next-auth/adapters";
import type { JWT } from "next-auth/jwt";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/server/db";
import { getRedisConnection } from "@/server/queue/connection";
import { clearFailedSignIns, isRateLimited, recordFailedSignIn } from "@/server/auth/rate-limit";
import {
  createSessionRecord,
  deleteSessionRecord,
  getSessionRecord,
} from "@/server/auth/session-store";
import { getClientIpAddress } from "@/server/auth/request";
import { verifyUserCredentials } from "@/server/services/user-auth";

class RateLimitedCredentialsError extends CredentialsSignin {
  code = "rate_limited";
}

function createAdapter(): Adapter {
  return {
    async deleteSession(sessionToken) {
      const session = await db.session.findUnique({ where: { sessionToken } });
      await db.session.deleteMany({ where: { sessionToken } });
      return session
        ? {
            expires: session.expiresAt,
            sessionToken: session.sessionToken,
            userId: session.userId,
          }
        : null;
    },
    async getSessionAndUser(sessionToken) {
      const record = await db.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });

      if (!record) {
        return null;
      }

      return {
        session: {
          expires: record.expiresAt,
          sessionToken: record.sessionToken,
          userId: record.userId,
        },
        user: {
          email: record.user.email,
          emailVerified: record.user.emailVerifiedAt,
          id: record.user.id,
          name: record.user.username,
        },
      };
    },
    async getUser(id) {
      const user = await db.user.findUnique({ where: { id } });
      if (!user) {
        return null;
      }
      return {
        email: user.email,
        emailVerified: user.emailVerifiedAt,
        id: user.id,
        name: user.username,
      };
    },
    async getUserByEmail(email) {
      const user = await db.user.findUnique({ where: { email } });
      if (!user) {
        return null;
      }
      return {
        email: user.email,
        emailVerified: user.emailVerifiedAt,
        id: user.id,
        name: user.username,
      };
    },
    async updateUser(user) {
      const updated = await db.user.update({
        where: { id: user.id },
        data: {
          email: user.email,
          emailVerifiedAt: user.emailVerified ?? undefined,
          username: user.name ?? undefined,
        },
      });

      return {
        email: updated.email,
        emailVerified: updated.emailVerifiedAt,
        id: updated.id,
        name: updated.username,
      };
    },
  };
}

async function hydrateJwtToken(token: JWT) {
  if (!token.sessionToken || !token.userId) {
    return token;
  }

  const session = await getSessionRecord(token.sessionToken);

  if (!session || session.expiresAt <= new Date()) {
    if (token.sessionToken) {
      await deleteSessionRecord(token.sessionToken);
    }

    return {
      ...token,
      invalidSession: true,
      sessionToken: undefined,
    };
  }

  return {
    ...token,
    email: session.user.email,
    invalidSession: false,
    name: session.user.username,
    userId: session.user.id,
  };
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: createAdapter(),
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        password: { label: "Password", type: "password" },
        username: { label: "Username", type: "text" },
      },
      async authorize(credentials, request) {
        const username = typeof credentials.username === "string" ? credentials.username.trim() : "";
        const password = typeof credentials.password === "string" ? credentials.password : "";

        if (!username || !password) {
          return null;
        }

        const identity = {
          ipAddress: getClientIpAddress(request.headers),
          username,
        };

        if (await isRateLimited(getRedisConnection(), identity)) {
          throw new RateLimitedCredentialsError();
        }

        const user = await verifyUserCredentials(username, password);

        if (!user) {
          await recordFailedSignIn(getRedisConnection(), identity);
          return null;
        }

        await clearFailedSignIns(getRedisConnection(), identity);

        return {
          email: user.email,
          id: user.id,
          name: user.username,
        };
      },
    }),
  ],
  session: {
    maxAge: 60 * 60 * 24 * 30,
    strategy: "jwt",
  },
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        const session = await createSessionRecord(user.id);
        return {
          ...token,
          email: user.email,
          invalidSession: false,
          name: user.name,
          sessionToken: session.sessionToken,
          userId: user.id,
        };
      }

      return hydrateJwtToken(token);
    },
    async session({ session, token }) {
      if (!token.userId) {
        return session;
      }

      session.invalidSession = Boolean(token.invalidSession);
      if (typeof token.sessionToken === "string") {
        session.sessionToken = token.sessionToken;
      }
      if (!session.user) {
        session.user = {
          email: typeof token.email === "string" ? token.email : "",
          emailVerified: null,
          id: token.userId,
          name: typeof token.name === "string" ? token.name : null,
        };
      }
      session.user.email = typeof token.email === "string" ? token.email : session.user.email;
      session.user.name = typeof token.name === "string" ? token.name : session.user.name;
      session.userId = token.userId;

      return session;
    },
  },
});
