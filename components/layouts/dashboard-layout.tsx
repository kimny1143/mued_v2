import { ReactNode } from "react";
import { Header } from "./header";
import { Footer } from "./footer";
import { UserAvatar } from "./user-avatar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 container mx-auto px-6 py-8">
        <UserAvatar />
        {children}
      </main>
      <Footer />
    </div>
  );
}
