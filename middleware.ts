import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  const publicPaths = ["/login", "/register", "/", "/api/auth"];
  const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path));
  
  // 未認証で保護されたルートにアクセスしようとしている場合
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  
  // 管理者以外が管理者用ページにアクセスしようとしている場合
  if (req.nextUrl.pathname.startsWith("/admin") && token?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}; 