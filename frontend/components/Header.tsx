"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSettingsStore } from "@/store/useSettingsStore";
import { checkHealth } from "@/lib/api";
import Logo from "@/components/Logo";

type BackendStatus = "checking" | "online" | "offline";

export default function Header() {
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [uptime, setUptime] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await checkHealth();
        if (!active) return;
        if (res.status === "ok") {
          setStatus("online");
          setUptime(Math.round(res.uptime));
        } else {
          setStatus("offline");
          setUptime(null);
        }
      } catch {
        if (!active) return;
        setStatus("offline");
        setUptime(null);
      }
    }

    poll();
    const interval = setInterval(poll, 10_000); // check every 10s
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const statusColor =
    status === "online"
      ? "bg-emerald-500"
      : status === "offline"
        ? "bg-red-500"
        : "bg-yellow-500";

  const statusText =
    status === "online"
      ? `Backend Online${uptime !== null ? ` · ${uptime}s` : ""}`
      : status === "offline"
        ? "Backend Offline"
        : "Checking…";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-surface-border bg-surface/80 px-4 backdrop-blur-md lg:px-6">
      <button
        onClick={toggleSidebar}
        className="rounded-md p-2 text-gray-400 transition-colors hover:bg-surface-overlay hover:text-white lg:hidden"
        aria-label="Toggle sidebar"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <Link href="/dashboard" className="flex items-center gap-2">
        <Logo size="sm" />
      </Link>

      <div className="ml-auto flex items-center gap-3">
        <div
          className={`hidden items-center gap-2 rounded-full px-3 py-1 text-xs font-medium sm:flex ${
            status === "online"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : status === "offline"
                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${statusColor} ${status === "online" ? "animate-pulse-slow" : status === "checking" ? "animate-pulse" : ""}`}
          />
          {statusText}
        </div>

        <Link
          href="/dashboard"
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700"
        >
          Dashboard
        </Link>
      </div>
    </header>
  );
}
