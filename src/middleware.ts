import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "@/server/observability/request-id";

const PUBLIC_PATHS = new Set(["/healthz", "/login", "/signup"]);

export default async function middleware(request: Request & { nextUrl: URL }) {
  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.has(pathname);
  const token = await getToken({ req: request as never, secret: process.env.AUTH_SECRET });
  const isSignedIn = Boolean(token?.userId) && !token?.invalidSession;
  const requestHeaders = new Headers(request.headers);
  const requestId = getOrCreateRequestId(requestHeaders);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  if (isPublicPath) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  if (!isSignedIn) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
