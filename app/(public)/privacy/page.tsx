import PrivacyPolicyJa from "@/components/legal/privacy-ja";

export const metadata = {
  title: "プライバシーポリシー | MUEDnote",
  description: "MUEDnoteのプライバシーポリシー",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <PrivacyPolicyJa />
    </div>
  );
}
