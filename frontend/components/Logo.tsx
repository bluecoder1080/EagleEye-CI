"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const SIZES = {
  sm: { box: "h-8 w-8", icon: "h-4 w-4", ring: "h-6 w-6", text: "text-lg" },
  md: { box: "h-10 w-10", icon: "h-5 w-5", ring: "h-7 w-7", text: "text-xl" },
  lg: { box: "h-12 w-12", icon: "h-6 w-6", ring: "h-8 w-8", text: "text-2xl" },
  xl: {
    box: "h-16 w-16",
    icon: "h-8 w-8",
    ring: "h-11 w-11",
    text: "text-3xl",
  },
};

export default function Logo({
  size = "md",
  showText = true,
  className,
}: LogoProps) {
  const s = SIZES[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Icon Mark */}
      <div className={cn("relative flex items-center justify-center", s.box)}>
        {/* Gradient background */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-indigo-600 shadow-lg shadow-brand-600/25" />

        {/* Inner glow ring */}
        <div className={cn("absolute rounded-lg bg-white/[0.08]", s.ring)} />

        {/* Eagle Eye SVG */}
        <svg
          className={cn("relative z-10 text-white drop-shadow-sm", s.icon)}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer eye shape */}
          <path
            d="M2 12C4 7.5 7.5 4.5 12 4.5C16.5 4.5 20 7.5 22 12C20 16.5 16.5 19.5 12 19.5C7.5 19.5 4 16.5 2 12Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="rgba(255,255,255,0.1)"
          />
          {/* Iris */}
          <circle
            cx="12"
            cy="12"
            r="4"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="rgba(255,255,255,0.15)"
          />
          {/* Pupil with gradient-like fill */}
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          {/* Highlight */}
          <circle cx="13.5" cy="10.5" r="1" fill="currentColor" opacity="0.6" />
          {/* Scan line - the "active" indicator */}
          <path
            d="M12 4.5V2M12 22v-2.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      </div>

      {/* Text */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-bold tracking-tight text-white", s.text)}>
            Eagle<span className="text-brand-400">Eye</span>
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500">
            CI / CD
          </span>
        </div>
      )}
    </div>
  );
}
