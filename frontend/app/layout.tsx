import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

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
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#338dff",
          colorBackground: "#12131a",
          colorInputBackground: "#1a1b26",
          colorInputText: "#e5e7eb",
          borderRadius: "0.75rem",
          fontFamily: '"Inter", system-ui, sans-serif',
        },
        elements: {
          card: "bg-surface-raised border border-surface-border shadow-2xl",
          formButtonPrimary: "bg-brand-600 hover:bg-brand-700",
        },
      }}
    >
      <html lang="en" className="dark">
        <body className="min-h-screen bg-surface font-sans">{children}</body>
      </html>
    </ClerkProvider>
  );
}
