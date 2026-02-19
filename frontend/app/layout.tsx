import type { Metadata } from "next";
import "./globals.css";
import ClientShell from "./client-shell";

export const metadata: Metadata = {
  title: "EagleEye CI — Autonomous CI/CD Healing Agent",
  description:
    "Multi-agent system that autonomously detects, diagnoses, and fixes CI/CD pipeline failures.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface font-sans">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
