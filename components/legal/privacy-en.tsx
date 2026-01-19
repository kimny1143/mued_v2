export default function PrivacyPolicyEn() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: January 8, 2026</p>

      <p className="mb-6">
        glasswerks inc. (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates MUEDnote (the &quot;App&quot;).
        This Privacy Policy explains how we collect, use, and protect your information
        when you use our App.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">1. Information We Collect</h2>
        <p className="mb-3">We collect the following types of information:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Account Information:</strong> Email address and authentication credentials
          </li>
          <li>
            <strong>Work Log Data:</strong> Focus/break session records and timestamps
          </li>
          <li>
            <strong>Voice Memos:</strong> Audio recordings you create and their transcriptions
          </li>
          <li>
            <strong>Usage Data:</strong> Anonymized data about how you use the App
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">2. How We Use Your Information</h2>
        <p className="mb-3">We use the collected information to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Provide and operate the App&apos;s features</li>
          <li>Transcribe voice memos and provide AI-powered analysis</li>
          <li>Provide customer support</li>
          <li>Improve our services and develop new features</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">3. Third-Party Services</h2>
        <p className="mb-3">
          We use the following third-party services to operate the App.
          Please review their respective privacy policies for information on how
          they handle your data:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Clerk</strong> (Authentication):{" "}
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
            <strong>OpenAI</strong> (Voice transcription - Whisper API):{" "}
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
            <strong>Vercel</strong> (Hosting):{" "}
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
            <strong>Neon</strong> (Database):{" "}
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
        <h2 className="text-xl font-semibold mb-4">4. Data Storage</h2>
        <p className="mb-3">
          Your data is stored on servers located in the United States.
          We implement appropriate technical and organizational measures to protect your data.
        </p>
        <p>
          Data is retained until you delete your account or for as long as necessary
          to provide our services.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">5. Your Rights</h2>
        <p className="mb-3">You have the right to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Access your personal data</li>
          <li>Request correction of your data</li>
          <li>Request deletion of your data</li>
          <li>Request export of your data</li>
        </ul>
        <p className="mt-3">
          To exercise these rights, please contact us using the information below.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">6. Cookies</h2>
        <p>
          The App uses cookies necessary for maintaining authentication state
          and providing our services.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">7. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time.
          We will notify you of any significant changes through the App.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">8. Contact Us</h2>
        <p className="mb-2">
          If you have any questions about this Privacy Policy, please contact us:
        </p>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="font-semibold">glasswerks inc.</p>
          <p>4-7-27-3F Aobadai, Meguro-ku, Tokyo 153-0042, Japan</p>
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
