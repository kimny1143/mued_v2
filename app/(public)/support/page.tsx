export const metadata = {
  title: "サポート | MUEDnote",
  description: "MUEDnoteのサポートページ",
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">サポート</h1>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">お問い合わせ</h2>
          <p className="mb-4">
            MUEDnoteに関するご質問、ご要望、不具合のご報告は、以下のメールアドレスまでお問い合わせください。
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-semibold">glasswerks inc.</p>
            <p>
              Email:{" "}
              <a
                href="mailto:support@glasswerks.jp"
                className="text-blue-600 hover:underline"
              >
                support@glasswerks.jp
              </a>
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">よくある質問</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Q: 音声認識がうまく動作しません</h3>
              <p className="text-gray-700">
                A: マイクへのアクセス許可が有効になっているか確認してください。
                設定アプリから MUEDnote のマイク許可を確認できます。
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Q: データを削除したい</h3>
              <p className="text-gray-700">
                A: アカウント削除をご希望の場合は、サポートまでご連絡ください。
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">運営会社</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-semibold">glasswerks inc.</p>
            <p>〒153-0042 東京都目黒区青葉台4-7-27 3F</p>
          </div>
        </section>
      </div>
    </div>
  );
}
