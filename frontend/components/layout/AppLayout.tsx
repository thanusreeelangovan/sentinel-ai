"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/simulator", label: "Transaction Simulator", icon: "🎯" },
  { href: "/monitoring", label: "Transaction Monitoring", icon: "🔎" },
  { href: "/salami-alerts", label: "Salami Attack Alerts", icon: "🚨" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-background-primary">
      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed top-0 left-0 h-full bg-background-secondary border-r border-border-default transition-all duration-300 z-40",
          sidebarOpen ? "w-64" : "w-0 md:w-20"
        )}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-border-default">
            <div className="text-2xl">🛡️</div>
            {sidebarOpen && (
              <div className="flex flex-col gap-0.5">
                <h1 className="text-lg font-bold text-text-primary">
                  Sentinel<span className="text-accent-blue">AI</span>
                </h1>
                <p className="text-xs text-text-tertiary">
                  Fraud Detection
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-6 flex flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors",
                    isActive
                      ? "bg-accent-blue text-white"
                      : "text-text-secondary hover:bg-background-tertiary hover:text-text-primary"
                  )}
                  title={item.label}
                >
                  <span className="text-lg min-w-max">{item.icon}</span>
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* System Status */}
          <div className="border-t border-border-default px-3 py-4">
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <div className="w-2 h-2 rounded-full bg-accent-approve" />
              {sidebarOpen && <span>System Online</span>}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={clsx(
          "flex-1 flex flex-col transition-all duration-300",
          sidebarOpen ? "md:ml-64" : "md:ml-20"
        )}
      >
        {/* Top Bar */}
        <header className="bg-background-secondary border-b border-border-default sticky top-0 z-30 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-background-tertiary text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            <div className="flex items-center gap-4">
              <div className="text-sm text-text-tertiary">
                Connected · Status: OK
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
