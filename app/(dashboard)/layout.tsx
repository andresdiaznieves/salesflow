"use client";

import { AuthProvider } from "@/components/shared/auth-provider";
import { Sidebar } from "@/components/shared/sidebar";
import { Navbar } from "@/components/shared/navbar";
import { BottomNav } from "@/components/shared/bottom-nav";
import { InstallPrompt } from "@/components/shared/install-prompt";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
            {children}
          </main>
          <BottomNav />
          <InstallPrompt />
        </div>
      </div>
    </AuthProvider>
  );
}
