import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth/session";

const SESSION_COOKIE = "smartmes_session";
const PROTECTED = ["/mockups", "/kiosk", "/print"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET ?? "";
  const session = token ? await verifySession(token, secret, Date.now()) : null;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/mockups/:path*", "/kiosk/:path*", "/kiosk", "/print/:path*"],
};
