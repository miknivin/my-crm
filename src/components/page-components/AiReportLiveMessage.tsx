"use client";

import React from "react";
import VeryShortSpinnerPrimary from "@/components/ui/loaders/veryShortSpinnerPrimary";
import AiReportResponseView from "./AiReportResponseView";
import { AiFilterQueryResult, AiPlanOutcome } from "@/app/types/ai-report";
import type { AiPlanStepView } from "@/helpers/aiReportStream";

export type LiveStepStatus = "pending" | "running" | "done" | "error";

export type LiveAiMessage = {
  status: "planning" | "running" | "explaining" | "done" | "error";
  outcome?: AiPlanOutcome;
  planSteps: Array<AiPlanStepView & { status: LiveStepStatus; errorMessage?: string }>;
  results: AiFilterQueryResult[];
  explanation: string;
  errorMessage?: string;
};

export const createLiveMessage = (): LiveAiMessage => ({
  status: "planning",
  planSteps: [],
  results: [],
  explanation: "",
});

const OUTCOME_NOTICES: Record<Exclude<AiPlanOutcome, "ok">, { label: string; className: string }> = {
  unsupported: {
    label: "Not available with the current tools",
    className:
      "border-warning-300 bg-warning-50 text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-400",
  },
  needs_clarification: {
    label: "Needs more information",
    className:
      "border-blue-light-300 bg-blue-light-50 text-blue-light-700 dark:border-blue-light-500/40 dark:bg-blue-light-500/10 dark:text-blue-light-400",
  },
};

function StepStatusIcon({ status }: { status: LiveStepStatus }) {
  if (status === "running") return <VeryShortSpinnerPrimary />;
  if (status === "done") {
    return (
      <svg className="h-4 w-4 text-success-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  if (status === "error") {
    return (
      <svg className="h-4 w-4 text-error-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    );
  }
  return <span className="block h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />;
}

/**
 * Renders one assistant turn as it streams in: the planned pipeline with
 * per-step status, each step's rendered result as it lands, and the
 * explanation text typing out below.
 */
export default function AiReportLiveMessage({ live }: { live: LiveAiMessage }) {
  const notice = live.outcome && live.outcome !== "ok" ? OUTCOME_NOTICES[live.outcome] : null;

  return (
    <div className="space-y-3">
      {live.status === "planning" && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <VeryShortSpinnerPrimary />
          <span>Planning the report...</span>
        </div>
      )}

      {notice && (
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${notice.className}`}>
          {notice.label}
        </span>
      )}

      {live.planSteps.length > 0 && (
        <ul className="space-y-1.5">
          {live.planSteps.map((step, index) => (
            <li key={step.id} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                <StepStatusIcon status={step.status} />
              </span>
              <span>
                <span className="font-medium">Step {index + 1}:</span>{" "}
                {step.purpose || step.ui?.title || step.tool}
                {step.status === "error" && step.errorMessage && (
                  <span className="text-error-500"> — {step.errorMessage}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {live.results.length > 0 && (
        <AiReportResponseView response={{ success: true, results: live.results }} />
      )}

      {(live.explanation || live.status === "explaining") && (
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
          {live.explanation}
          {live.status === "explaining" && (
            <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-gray-400 align-middle dark:bg-gray-500" />
          )}
        </p>
      )}

      {live.status === "error" && live.errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400">{live.errorMessage}</p>
      )}
    </div>
  );
}
