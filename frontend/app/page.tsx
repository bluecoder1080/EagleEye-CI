"use client";

import Link from "next/link";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import Logo from "@/components/Logo";

const FEATURES = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
    title: "Multi-Agent Pipeline",
    desc: "Four specialised AI agents — Repo Analyzer, Failure Classifier, Fix Generator, and Healing Agent — collaborate to resolve failures end-to-end.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: "Sandboxed Testing",
    desc: "Every test runs inside an isolated Docker container. No side effects, no risk to production — just fast, reliable diagnosis.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "LLM-Powered Fixes",
    desc: "Powered by NVIDIA Qwen 3.5-397B — the agent reads your source, understands the failure context, and writes production-grade patches.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Safe Branch Pushes",
    desc: "Fixes are committed to a separate healing branch — never touching main. Review at your pace, merge when confident.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: "Retry & Verify Loop",
    desc: "Up to 5 automated iterations — fix, test, repeat — until the build turns green or the retry limit is reached.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Real-Time Dashboard",
    desc: "Live timeline, score breakdown, and per-fix diffs — watch the agent diagnose and heal your pipeline in real-time.",
  },
];

const STEPS = [
  { num: "01", label: "Clone", accent: "from-blue-500 to-cyan-500" },
  { num: "02", label: "Test", accent: "from-cyan-500 to-teal-500" },
  { num: "03", label: "Classify", accent: "from-teal-500 to-emerald-500" },
  { num: "04", label: "Fix", accent: "from-emerald-500 to-brand-500" },
  { num: "05", label: "Push", accent: "from-brand-500 to-violet-500" },
  { num: "06", label: "Monitor", accent: "from-violet-500 to-purple-500" },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ── Background effects ─────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Radial glow - top center */}
        <div className="absolute -top-48 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-brand-600/[0.07] blur-[120px]" />
        {/* Radial glow - bottom right */}
        <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-indigo-600/[0.05] blur-[100px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:text-white">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all hover:bg-brand-500 hover:shadow-brand-500/30 hover:-translate-y-0.5">
                Get Started
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all hover:bg-brand-500 hover:shadow-brand-500/30 hover:-translate-y-0.5"
            >
              Go to Dashboard →
            </Link>
          </SignedIn>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-24 text-center lg:px-8 lg:pt-28 lg:pb-32">
        {/* Badge */}
        <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/[0.08] px-4 py-1.5 text-sm font-medium text-brand-400">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
          RIFT 2026 — Autonomous CI/CD Agent
        </div>

        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
          Your CI/CD Pipeline{" "}
          <span className="bg-gradient-to-r from-brand-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Heals Itself
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
          EagleEye CI detects failing builds, diagnoses root causes with AI, writes and tests
          fixes autonomously — and pushes clean patches before you finish your coffee.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="group relative rounded-xl bg-brand-600 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-brand-600/25 transition-all hover:bg-brand-500 hover:shadow-brand-500/30 hover:-translate-y-0.5">
                Start Healing Free
                <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
              </button>
            </SignUpButton>
            <a
              href="https://github.com/bluecoder1080/EagleEye-CI"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-surface-border px-6 py-3.5 text-base font-medium text-gray-300 transition-colors hover:border-gray-600 hover:text-white"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              View on GitHub
            </a>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="group relative rounded-xl bg-brand-600 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-brand-600/25 transition-all hover:bg-brand-500 hover:shadow-brand-500/30 hover:-translate-y-0.5"
            >
              Open Dashboard
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* ── Pipeline Steps ─────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-16 lg:px-8">
        <h2 className="mb-12 text-center text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
          6-Step Autonomous Pipeline
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {STEPS.map(({ num, label, accent }) => (
            <div
              key={num}
              className="group flex flex-col items-center rounded-2xl border border-surface-border bg-surface-raised/60 p-5 text-center transition-all hover:border-brand-500/30 hover:bg-surface-overlay/60"
            >
              <span
                className={`mb-3 bg-gradient-to-r ${accent} bg-clip-text text-2xl font-black text-transparent`}
              >
                {num}
              </span>
              <span className="text-sm font-semibold text-white">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ──────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Built for{" "}
            <span className="bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent">
              production
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-gray-500">
            Every component is designed for reliability, security, and speed.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-2xl border border-surface-border bg-surface-raised/50 p-6 transition-all hover:border-brand-500/20 hover:bg-surface-overlay/50"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600/10 text-brand-400 transition-colors group-hover:bg-brand-600/20">
                {icon}
              </div>
              <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-20 text-center lg:px-8">
        <div className="rounded-3xl border border-surface-border bg-gradient-to-b from-surface-raised to-surface p-12">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to stop babysitting CI?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-gray-500">
            Let EagleEye handle the failures. Focus on shipping features.
          </p>
          <div className="mt-8">
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="rounded-xl bg-brand-600 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-brand-600/25 transition-all hover:bg-brand-500 hover:shadow-brand-500/30 hover:-translate-y-0.5">
                  Get Started — It's Free
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="inline-block rounded-xl bg-brand-600 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-brand-600/25 transition-all hover:bg-brand-500 hover:shadow-brand-500/30 hover:-translate-y-0.5"
              >
                Go to Dashboard →
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-surface-border py-8 text-center text-xs text-gray-600">
        <p>
          © {new Date().getFullYear()} EagleEye CI — RIFT 2026.
          Built with Next.js, Express, Docker & AI.
        </p>
      </footer>
    </div>
  );
}
