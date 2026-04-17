import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = new Set(["/login", "/signup"]);

export default async function middleware(request: Request & { nextUrl: URL }) {
  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.has(pathname);
  const token = await getToken({ req: request as never, secret: process.env.AUTH_SECRET });
  const isSignedIn = Boolean(token?.userId) && !token?.invalidSession;

  if (isPublicPath && isSignedIn) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  if (!isPublicPath && !isSignedIn) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
