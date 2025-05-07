import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// パブリックルートのリスト
const publicPaths = ["/login", "/register", "/", "/api/auth"];

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // パブリックルートへのアクセスはそのまま許可
  const isPublicPath = publicPaths.some((publicPath) => 
    path === publicPath || path.startsWith(`${publicPath}/`)
  );

  // ルート判定とリダイレクト処理
  if (!token && !isPublicPath) {
    // 認証されていないユーザーで、非公開パスへのアクセスの場合
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", encodeURI(path));
    return NextResponse.redirect(url);
  }

  if (token && (path === "/login" || path === "/register")) {
    // すでに認証済みのユーザーがログイン/登録ページにアクセスした場合
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 管理者以外が管理者用ページにアクセスしようとしている場合
  if (path.startsWith("/admin") && token?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}; 