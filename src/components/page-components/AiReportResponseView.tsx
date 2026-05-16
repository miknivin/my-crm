/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import DynamicTable from "@/components/ui/table/DynamicTable";
import AiReportStatCards from "./AiReportStatCards";
import AiReportDynamicChart from "./AiReportDynamicChart";
import {
  AiFilterQueryResponse,
  AiFilterQueryResult,
  AiFilterQueryStep,
  AiChart,
} from "@/app/types/ai-report";

type Props = {
  response: AiFilterQueryResponse;
};

const headerFromKey = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();

const OBJECT_ID_PATTERN = /\b[0-9a-fA-F]{24}\b/g;
const USER_MENTION_PATTERN = /@users:([^\s]+)/g;

const sanitizeDisplayText = (
  value: string,
  replacements: Record<string, string> = {}
) => {
  let next = value;

  Object.entries(replacements).forEach(([id, label]) => {
    if (!id || !label) return;
    next = next.replace(new RegExp(`\\b${id}\\b`, "g"), label);
  });

  return next
    .replace(OBJECT_ID_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\(\s*\)/g, "")
    .replace(/\[\s*\]/g, "")
    .replace(/\s+([,.:;])/g, "$1")
    .trim();
};

const extractUserMentionMap = (
  rawPrompt?: string,
  rawPromptInternal?: string
) => {
  if (!rawPrompt || !rawPromptInternal) return {};

  const displayMentions = [...rawPrompt.matchAll(USER_MENTION_PATTERN)];
  const internalMentions = [...rawPromptInternal.matchAll(USER_MENTION_PATTERN)];
  const replacements: Record<string, string> = {};

  internalMentions.forEach((match, index) => {
    const id = match[1]?.trim();
    const displayLabel = displayMentions[index]?.[1]?.trim();

    if (!id || !displayLabel) return;
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return;

    replacements[id] = displayLabel;
  });

  return replacements;
};

const formatDate = (value: unknown) => {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return value;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatCategory = (
  value: unknown,
  replacements: Record<string, string> = {}
) => {
  if (value == null) return "Unknown";
  const raw = String(value);
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleString("en-IN", { month: "short", year: "numeric" });
  }
  return sanitizeDisplayText(raw, replacements) || "Unknown";
};

const OMIT_KEYS = new Set(["_id", "role", "__v"]);

const stripPrivateFields = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stripPrivateFields);
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const obj = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    Object.entries(obj).forEach(([key, val]) => {
      if (OMIT_KEYS.has(key)) return;
      next[key] = stripPrivateFields(val);
    });
    return next;
  }
  return value;
};

const normalizeRows = (rows: Array<Record<string, unknown>>) =>
  rows.map((row) => {
    const next: Record<string, unknown> = {};
    Object.entries(row).forEach(([key, value]) => {
      if (OMIT_KEYS.has(key)) return;
      if (key === "createdAt" || key === "updatedAt") {
        next[key] = formatDate(value);
        return;
      }
      next[key] = stripPrivateFields(value);
    });
    return next;
  });

const resolveResult = (
  item: AiFilterQueryResult | AiFilterQueryStep
): { step: AiFilterQueryStep; result?: AiFilterQueryResult } => {
  if ((item as AiFilterQueryResult).step) {
    const result = item as AiFilterQueryResult;
    return { step: result.step, result };
  }

  return { step: item as AiFilterQueryStep };
};

const buildStatCardSummary = (
  row: Record<string, unknown>,
  fallbackTitle?: string,
  replacements: Record<string, string> = {}
) => {
  const cleaned = stripPrivateFields(row);
  if (!cleaned || typeof cleaned !== "object" || Array.isArray(cleaned)) return null;

  const statRow = cleaned as Record<string, unknown>;
  const explicitTitle = typeof statRow.title === "string" ? statRow.title : fallbackTitle;
  const metricEntry = Object.entries(statRow).find(
    ([key, value]) => key !== "title" && (typeof value === "number" || typeof value === "string")
  );

  if (!metricEntry) return null;

  const [metricKey, metricValue] = metricEntry;
  const cardTitle = sanitizeDisplayText(
    explicitTitle || headerFromKey(metricKey),
    replacements
  );

  return { [cardTitle]: metricValue as string | number };
};

const buildChartFromResult = (
  result: AiFilterQueryResult,
  step: AiFilterQueryStep,
  replacements: Record<string, string> = {}
): AiChart | null => {
  if (!result.data || result.data.length === 0) return null;

  const sample = result.data[0] || {};
  const numericKey = Object.keys(sample).find((key) => key !== "_id" && typeof (sample as any)[key] === "number");
  if (!numericKey) return null;

  const categories = result.data.map((row) =>
    formatCategory((row as any)._id ?? "Unknown", replacements)
  );
  const values = result.data.map((row) => Number((row as any)[numericKey] ?? 0));

  return {
    type: step.type === "aggregate" ? "bar" : "line",
    categories,
    series: [{ name: numericKey, data: values }],
    title: step.ui?.title ? sanitizeDisplayText(step.ui.title, replacements) : undefined,
  };
};

const renderStep = (
  item: AiFilterQueryResult | AiFilterQueryStep,
  index: number,
  replacements: Record<string, string>
) => {
  const { step, result } = resolveResult(item);
  const ui = step.ui || { type: "table" as const };
  const showStats = ui.type === "stat_card" || ui.type === "stat_table";
  const showTable = ui.type === "table" || ui.type === "stat_table";
  const chart =
    result?.chart ||
    (ui.type === "chart_trend" && result
      ? buildChartFromResult(result, step, replacements)
      : null);
  const showChart = ui.type === "chart_trend" && chart;
  const containerId = `ai-response-${index}`;
  const statSummaries =
    showStats && result?.data?.length
      ? result.data
          .map((row) => buildStatCardSummary(row, ui.title, replacements))
          .filter((summary): summary is Record<string, string | number> => Boolean(summary))
      : [];

  const tableRowsRaw = result?.data?.length ? result.data : result?.samples || [];
  const tableRows = normalizeRows(tableRowsRaw);
  const columns =
    tableRows.length > 0
      ? Object.keys(tableRows[0]).map((key) => ({ key, header: headerFromKey(key) }))
      : [];

  return (
    <div key={`step-${index}`} className="space-y-3">
      <div className="flex items-start gap-2">
        {ui.title && (
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {sanitizeDisplayText(ui.title, replacements)}
          </div>
        )}
        <details className="relative ml-auto" data-export-exclude>
          <summary className="list-none cursor-pointer select-none rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700">
            Export
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <button
              type="button"
              onClick={async () => {
                const element = document.getElementById(containerId);
                if (!element) return;
                const exportRoot = element.closest("[data-export-root]");
                const exportControls = exportRoot?.querySelector("[data-export-exclude]") as HTMLDetailsElement | null;
                if (exportControls?.open) exportControls.open = false;
                const canvas = await html2canvas(element, {
                  backgroundColor: null,
                  scale: 2,
                  useCORS: true,
                  ignoreElements: (node) =>
                    node instanceof HTMLElement && node.hasAttribute("data-export-exclude"),
                });
                const link = document.createElement("a");
                link.href = canvas.toDataURL("image/png");
                link.download = "ai-response.png";
                link.click();
              }}
              className="w-full rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Export as Image
            </button>
            <button
              type="button"
              onClick={async () => {
                const element = document.getElementById(containerId);
                if (!element) return;
                const exportRoot = element.closest("[data-export-root]");
                const exportControls = exportRoot?.querySelector("[data-export-exclude]") as HTMLDetailsElement | null;
                if (exportControls?.open) exportControls.open = false;
                const canvas = await html2canvas(element, {
                  backgroundColor: null,
                  scale: 2,
                  useCORS: true,
                  ignoreElements: (node) =>
                    node instanceof HTMLElement && node.hasAttribute("data-export-exclude"),
                });
                const imgData = canvas.toDataURL("image/jpeg", 0.9);
                const orientation = canvas.width > canvas.height ? "landscape" : "portrait";
                const pdf = new jsPDF({
                  orientation,
                  unit: "px",
                  format: [canvas.width, canvas.height],
                });
                pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
                pdf.save("ai-response.pdf");
              }}
              className="mt-1 w-full rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Export as PDF
            </button>
          </div>
        </details>
      </div>
      <div id={containerId} className="space-y-3" data-export-root>
        {showStats &&
          statSummaries.map((summary, statIndex) => (
            <AiReportStatCards
              key={`step-${index}-stat-${statIndex}`}
              summary={summary}
            />
          ))}
        {showChart && chart && <AiReportDynamicChart chart={chart} />}
        {showTable && <DynamicTable columns={columns} rows={tableRows} />}
      </div>
    </div>
  );
};

export default function AiReportResponseView({ response }: Props) {
  const items = response.results || response.steps || [];
  const replacements = extractUserMentionMap(response.rawPrompt, response.rawPromptInternal);

  return (
    <div className="space-y-3">
      {items.map((item, index) => renderStep(item, index, replacements))}
    </div>
  );
}
