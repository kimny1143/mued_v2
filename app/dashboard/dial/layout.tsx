import Link from "next/link";
import { cookies } from "next/headers";
import { Headphones } from "lucide-react";
import { DialHeaderActions } from "./dial-header-actions";

export default async function DialDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value ?? "en") as "en" | "ja";
  const messages = (await import(`../../../messages/${locale}.json`)).default;
  const t = messages;

  return (
    <div className="min-h-screen flex flex-col bg-[#0F0F1A]">
      <header className="bg-[#0F0F1A] border-b border-white/10 sticky top-0 z-50">
        <nav className="container mx-auto px-6 py-4" aria-label="MUEDial Dashboard">
          <div className="flex items-center justify-between">
            <Link href="/dashboard/dial" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-600/20 rounded-lg flex items-center justify-center">
                <Headphones className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-xl font-bold text-white">MUEDial</span>
            </Link>
            <DialHeaderActions
              newSessionLabel={t.dial.dashboard.newSession}
              logOutLabel={t.dial.dashboard.logOut}
            />
          </div>
        </nav>
      </header>
      <main className="flex-1 container mx-auto px-6 py-8">{children}</main>
      <footer className="bg-[#0F0F1A] py-6 border-t border-white/10">
        <div className="container mx-auto px-6 text-center text-white/40 text-sm">
          <p>
            &copy; {new Date().getFullYear()} MUEDial.{" "}
            {t.dial.dashboard.allRightsReserved}
          </p>
        </div>
      </footer>
    </div>
  );
}
