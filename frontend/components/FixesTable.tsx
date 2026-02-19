"use client";

import type { FixRecord } from "@/types";
import { BUG_TYPE_COLORS, BUG_TYPE_LABELS } from "@/lib/constants";

interface FixesTableProps {
  fixes: FixRecord[];
}

export default function FixesTable({ fixes }: FixesTableProps) {
  const applied = (fixes ?? []).filter((f) => f.fixApplied).length;

  return (
    <div className="glass-card animate-slide-up space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04]">
            <svg
              className="h-5 w-5 text-brand-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Fixes Applied</h2>
            <p className="text-xs text-gray-500">
              {applied}/{fixes.length} fixes successfully applied
            </p>
          </div>
        </div>
        <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs font-medium text-gray-400 tabular-nums">
          {fixes.length} total
        </span>
      </div>

      {fixes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <svg
            className="h-10 w-10 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-3 text-sm text-gray-500">No fixes recorded</p>
        </div>
      ) : (
        <div className="-mx-6 overflow-x-auto px-6">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="pb-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    File
                  </th>
                  <th className="pb-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Bug Type
                  </th>
                  <th className="pb-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Line
                  </th>
                  <th className="pb-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Error
                  </th>
                  <th className="pb-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {fixes.map((fix, idx) => (
                  <tr
                    key={idx}
                    className="group transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="whitespace-nowrap py-3 pr-4">
                      <span className="font-mono text-xs text-brand-400">
                        {fix.file}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                          BUG_TYPE_COLORS[fix.bugType] ||
                          "bg-gray-500/20 text-gray-400 border-gray-500/30"
                        }`}
                      >
                        {BUG_TYPE_LABELS[fix.bugType] || fix.bugType}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4">
                      <span className="font-mono text-xs text-gray-400 tabular-nums">
                        {fix.line > 0 ? fix.line : "—"}
                      </span>
                    </td>
                    <td className="max-w-[280px] py-3 pr-4">
                      <p
                        className="truncate text-xs text-gray-400"
                        title={fix.error}
                      >
                        {fix.error}
                      </p>
                    </td>
                    <td className="whitespace-nowrap py-3">
                      {fix.fixApplied ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Fixed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400">
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
