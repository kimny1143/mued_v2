import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          ようこそ、{user.firstName || user.username || user.emailAddresses?.[0]?.emailAddress || "ユーザー"}さん！
        </h1>
        <p className="text-gray-600 mt-2">MUED LMS ダッシュボード</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* レッスン予約カード */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">レッスン予約</h2>
          <p className="text-gray-600 mb-4">
            メンターのスケジュールを確認して、レッスンを予約しましょう
          </p>
          <Link
            href="/dashboard/lessons"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            予約する
          </Link>
        </div>

        {/* マイレッスン */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">マイレッスン</h2>
          <p className="text-gray-600 mb-4">
            予約済みのレッスンを確認できます
          </p>
          <Link
            href="/dashboard/reservations"
            className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
          >
            確認する
          </Link>
        </div>

        {/* 教材 */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">教材ライブラリ</h2>
          <p className="text-gray-600 mb-4">
            学習教材にアクセスできます
          </p>
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">
            閲覧する
          </button>
        </div>

        {/* メッセージ */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">メッセージ</h2>
          <p className="text-gray-600 mb-4">
            メンターとのやり取りを確認できます
          </p>
          <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition">
            開く
          </button>
        </div>

        {/* プロフィール */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">プロフィール</h2>
          <p className="text-gray-600 mb-4">
            アカウント情報を管理できます
          </p>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition">
            編集する
          </button>
        </div>

        {/* サブスクリプション */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">サブスクリプション</h2>
          <p className="text-gray-600 mb-4">
            現在のプラン: フリープラン
          </p>
          <button className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition">
            アップグレード
          </button>
        </div>
      </div>
    </div>
  );
}