import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Edge-safe auth instance (no Prisma/bcrypt) just for route protection.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isLogin = pathname === "/login";

  if (!isLoggedIn && !isLogin) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isLogin) {
    return NextResponse.redirect(new URL("/board", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
