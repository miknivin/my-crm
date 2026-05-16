"use client";

import React from "react";
import { AiSummary } from "@/app/types/ai-report";

type Props = {
  summary: AiSummary;
};

const headerFromKey = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();

const renderValue = (value: number | string) =>
  typeof value === "number" ? value.toLocaleString() : value;

export default function AiReportStatCards({ summary }: Props) {
  const entries = Object.entries(summary);
  if (!entries.length) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400">{headerFromKey(key)}</p>
          <p className="mt-1 text-lg font-semibold text-gray-800 dark:text-white">
            {renderValue(value)}
          </p>
        </div>
      ))}
    </div>
  );
}
