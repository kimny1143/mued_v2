export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 認証ページでは認証チェックをスキップ
  return <>{children}</>;
}