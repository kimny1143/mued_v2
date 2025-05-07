import { NextResponse } from "next/server";
import { supabase } from "@lib/supabase";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // 入力検証
    if (!email || !password) {
      return NextResponse.json(
        { message: "メールアドレスとパスワードは必須です" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "パスワードは8文字以上である必要があります" },
        { status: 400 }
      );
    }

    // Supabase Authを使用してユーザー登録
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // emailConfirm: true の場合、確認メールが送信されます
        emailRedirectTo: `${process.env.NEXT_PUBLIC_URL}/auth/callback`,
      },
    });

    if (error) {
      // エラーメッセージを日本語化
      let errorMessage = "アカウント登録に失敗しました";
      if (error.message.includes("already registered")) {
        errorMessage = "このメールアドレスは既に登録されています";
      } else if (error.message.includes("invalid")) {
        errorMessage = "メールアドレスまたはパスワードが無効です";
      }

      console.error("サインアップエラー:", error);
      return NextResponse.json(
        { message: errorMessage },
        { status: 400 }
      );
    }

    // 登録成功の場合
    return NextResponse.json(
      {
        user: data.user,
        message: "アカウントが正常に作成されました",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("サーバーエラー:", error);
    return NextResponse.json(
      { message: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
} 