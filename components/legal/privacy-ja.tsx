export default function PrivacyPolicyJa() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">プライバシーポリシー</h1>
      <p className="text-sm text-gray-500 mb-8">最終更新日: 2026年1月8日</p>

      <p className="mb-6">
        glasswerks inc.（以下「当社」）は、MUEDnote（以下「本アプリ」）における
        ユーザーの個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">1. 収集する情報</h2>
        <p className="mb-3">本アプリでは、以下の情報を収集します。</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>アカウント情報:</strong> メールアドレス、認証に必要な情報
          </li>
          <li>
            <strong>作業ログデータ:</strong> フォーカス/ブレイクの記録、タイムスタンプ
          </li>
          <li>
            <strong>音声メモ:</strong> ユーザーが録音した音声データおよびその文字起こしテキスト
          </li>
          <li>
            <strong>利用状況:</strong> アプリの使用状況に関する匿名化されたデータ
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">2. 情報の利用目的</h2>
        <p className="mb-3">収集した情報は、以下の目的で利用します。</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>本アプリの機能提供およびサービスの運営</li>
          <li>音声メモの文字起こしおよびAIによる分析</li>
          <li>ユーザーサポートの提供</li>
          <li>サービスの改善および新機能の開発</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">3. 第三者サービスの利用</h2>
        <p className="mb-3">
          本アプリでは、サービス提供のために以下の第三者サービスを利用しています。
          各サービスにおけるデータの取り扱いについては、それぞれのプライバシーポリシーをご確認ください。
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Clerk</strong>（認証サービス）:{" "}
            <a
              href="https://clerk.com/privacy"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://clerk.com/privacy
            </a>
          </li>
          <li>
            <strong>OpenAI</strong>（音声文字起こし - Whisper API）:{" "}
            <a
              href="https://openai.com/privacy"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://openai.com/privacy
            </a>
          </li>
          <li>
            <strong>Vercel</strong>（ホスティング）:{" "}
            <a
              href="https://vercel.com/legal/privacy-policy"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://vercel.com/legal/privacy-policy
            </a>
          </li>
          <li>
            <strong>Neon</strong>（データベース）:{" "}
            <a
              href="https://neon.tech/privacy-policy"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://neon.tech/privacy-policy
            </a>
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">4. データの保存</h2>
        <p className="mb-3">
          ユーザーのデータは、米国に所在するサーバーに保存されます。
          当社は、適切な技術的・組織的措置を講じてデータを保護します。
        </p>
        <p>
          データは、ユーザーがアカウントを削除するまで、またはサービス提供に
          必要な期間保存されます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">5. ユーザーの権利</h2>
        <p className="mb-3">ユーザーは以下の権利を有します。</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>自己のデータへのアクセス権</li>
          <li>データの訂正を求める権利</li>
          <li>データの削除を求める権利</li>
          <li>データのエクスポートを求める権利</li>
        </ul>
        <p className="mt-3">
          これらの権利を行使する場合は、下記のお問い合わせ先までご連絡ください。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">6. Cookieの使用</h2>
        <p>
          本アプリでは、認証状態の維持およびサービスの提供に必要なCookieを使用します。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">7. プライバシーポリシーの変更</h2>
        <p>
          当社は、必要に応じて本ポリシーを変更することがあります。
          重要な変更がある場合は、本アプリ上で通知します。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">8. お問い合わせ</h2>
        <p className="mb-2">
          本ポリシーに関するお問い合わせは、以下までご連絡ください。
        </p>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="font-semibold">glasswerks inc.</p>
          <p>〒153-0042 東京都目黒区青葉台4-7-27 3F</p>
          <p>
            Email:{" "}
            <a
              href="mailto:info@glasswerks.jp"
              className="text-blue-600 hover:underline"
            >
              info@glasswerks.jp
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
