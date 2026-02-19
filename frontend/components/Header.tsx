"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { useSettingsStore } from "@/store/useSettingsStore";
import { APP_NAME } from "@/lib/constants";
import { checkHealth } from "@/lib/api";

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

      <Link href="/" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
          <svg
            className="h-5 w-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </div>
        <span className="text-lg font-semibold text-white">{APP_NAME}</span>
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

        {/* Clerk Auth */}
        <SignedOut>
          <SignInButton mode="modal">
            <button className="rounded-lg border border-brand-500/30 bg-brand-600/20 px-3 py-1.5 text-xs font-medium text-brand-400 transition-colors hover:bg-brand-600/40">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="hidden rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700 sm:block">
              Sign Up
            </button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-8 w-8",
              },
            }}
          />
        </SignedIn>
      </div>
    </header>
  );
}
