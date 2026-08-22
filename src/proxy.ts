import { NextResponse, type NextRequest } from "next/server";
import { manageCookieName, slugFromPath, verifyManageToken } from "@/lib/token";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const slug = slugFromPath(pathname);
  if (!slug) return NextResponse.next();

  const token = request.cookies.get(manageCookieName(slug))?.value;
  if (verifyManageToken(token, slug)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/access/${slug}`;
  url.search = "";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/edit/:path*", "/manage/:path*"],
};
