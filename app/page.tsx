import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";

export default async function Home() {
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* ヘッダー */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">MUED LMS</h1>
          <div className="flex gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                ダッシュボード
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-gray-700 px-4 py-2 hover:text-blue-600 transition"
                >
                  ログイン
                </Link>
                <Link
                  href="/sign-up"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  無料で始める
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* ヒーローセクション */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            音楽レッスンを、もっと身近に
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            MUED LMSは、音楽を学びたい生徒と優秀なメンターをつなぐ
            <br />
            次世代の学習管理システムです
          </p>
          <div className="flex gap-4 justify-center">
            {user ? (
              <Link
                href="/dashboard"
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg hover:bg-blue-700 transition"
              >
                ダッシュボードへ
              </Link>
            ) : (
              <Link
                href="/sign-up"
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg hover:bg-blue-700 transition"
              >
                今すぐ無料で始める
              </Link>
            )}
          </div>
        </div>

        {/* 特徴セクション */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🎵</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">柔軟なスケジューリング</h3>
            <p className="text-gray-600">
              メンターと生徒の都合に合わせて、自由にレッスンをスケジュール
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📚</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">豊富な教材ライブラリ</h3>
            <p className="text-gray-600">
              AIが生成する個別化された教材で、効率的な学習をサポート
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">リアルタイムコミュニケーション</h3>
            <p className="text-gray-600">
              メンターと生徒がリアルタイムでやり取りできるチャット機能
            </p>
          </div>
        </div>

        {/* プランセクション */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center mb-12">料金プラン</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-gray-200">
              <h3 className="text-xl font-semibold mb-2">フリープラン</h3>
              <p className="text-3xl font-bold mb-4">¥0<span className="text-sm font-normal">/月</span></p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>✓ 月1回のレッスン予約</li>
                <li>✓ 基本教材へのアクセス</li>
                <li>✓ メッセージ機能</li>
              </ul>
              <Link
                href="/sign-up"
                className="block text-center bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                無料で始める
              </Link>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-blue-500">
              <h3 className="text-xl font-semibold mb-2">基本プラン</h3>
              <p className="text-3xl font-bold mb-4">¥2,980<span className="text-sm font-normal">/月</span></p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>✓ 月4回のレッスン予約</li>
                <li>✓ 全教材へのアクセス</li>
                <li>✓ 優先サポート</li>
              </ul>
              <Link
                href="/sign-up"
                className="block text-center bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                選択する
              </Link>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-purple-500">
              <h3 className="text-xl font-semibold mb-2">プレミアムプラン</h3>
              <p className="text-3xl font-bold mb-4">¥5,980<span className="text-sm font-normal">/月</span></p>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>✓ 無制限レッスン予約</li>
                <li>✓ AI教材生成機能</li>
                <li>✓ 1対1コーチング</li>
              </ul>
              <Link
                href="/sign-up"
                className="block text-center bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
              >
                選択する
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-gray-100 mt-24 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2025 MUED LMS - glasswerks inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}