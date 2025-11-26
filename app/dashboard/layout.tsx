"use client";

import { ReactNode } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { AppSidebar } from "@/components/app-sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-slate-50">
        <AppSidebar />
        {/* Main Content */}
        <main id="main-content" className="flex-1 overflow-y-auto pt-16 lg:pt-0" role="main">
          {children}
        </main>
      </div>
    </ErrorBoundary>
  );
}
