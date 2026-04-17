import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    invalidSession?: boolean;
    sessionToken?: string;
    user: DefaultSession["user"];
    userId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    invalidSession?: boolean;
    sessionToken?: string;
    userId?: string;
  }
}
