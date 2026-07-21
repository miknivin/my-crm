/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateObject, streamText, type ModelMessage } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { isAuthenticatedUser, authorizeRoles } from "../../middlewares/auth";
import AiReportSessionMessage from "@/app/models/AiReportSessionMessage";
import AiReportSession from "@/app/models/AiReportSession";
import Contact from "@/app/models/Contact";

import dbConnect from "@/app/lib/db/connection";
import { PLANNER_PROMPT, EXPLAINER_PROMPT } from "@/app/lib/ai/pipelinePrompt";
import { validatePipeline, ensureProjectionCoversFilters } from "@/app/lib/ai/toolSpecs";

import { executeFindQuery } from "@/helpers/executeFindQuery";
import { executeAggregateQuery } from "@/helpers/executeAggregateQuery";
import { resolveDisplayNames } from "@/helpers/resolveAiDisplayNames";

const PLANNER_MODEL = "openai/gpt-4.1";
const EXPLAINER_MODEL = "openai/gpt-4.1";
const MAX_CONTEXT_TURNS = 6;
const MAX_ROWS_PER_STEP = 200;
const SAMPLE_ROWS_FOR_EXPLAINER = 5;

// ── Plan schema ──────────────────────────────────────────────────────
// Shape-level validation only; semantic validation (method names, arg
// counts/types, field allowlist) happens in validatePipeline afterwards,
// with one repair retry on failure.

const ActionArgValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string(), z.number()])),
]);

const ActionSchema = z.object({
  method: z.string(),
  args: z.array(ActionArgValueSchema).optional(),
});

const UiSchema = z.object({
  type: z.enum(["table", "stat_card", "stat_table", "chart_trend"]).default("table"),
  title: z.string().nullable().optional(),
});

const StepArgsSchema = z.object({
  filterActions: z.array(ActionSchema).default([]),
  aggregateActions: z.array(ActionSchema).default([]),
  projection: z.record(z.number()).nullable().optional(),
  sort: z.record(z.number()).nullable().optional(),
  limit: z.number().nullable().optional(),
  populate: z.array(z.string()).default([]),
  ui: UiSchema.default({ type: "table" }),
});

const PlanStepSchema = z.object({
  tool: z.enum(["findContacts", "aggregateContacts"]),
  purpose: z.string().default(""),
  args: StepArgsSchema,
});

const PipelineSchema = z.object({
  outcome: z.enum(["ok", "unsupported", "needs_clarification"]).default("ok"),
  steps: z.array(PlanStepSchema).max(3).default([]),
});

type Pipeline = z.infer<typeof PipelineSchema>;

// ── Helpers ──────────────────────────────────────────────────────────

async function authenticate(request: NextRequest) {
  const currentUser = await isAuthenticatedUser(request);
  authorizeRoles(currentUser, "admin", "team_member");
  const rawUserId = currentUser?._id;

  if (!rawUserId) throw new Error("Missing user id");
  if (!mongoose.isValidObjectId(rawUserId)) throw new Error("Invalid user id");

  const realUserId = new mongoose.Types.ObjectId(String(rawUserId));
  return { currentUser, realUserId };
}

function normalizeSessionId(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return new mongoose.Types.ObjectId().toString();
  return raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || new mongoose.Types.ObjectId().toString();
}

async function buildConversationMessages(
  sessionId: string,
  userId: mongoose.Types.ObjectId,
  newQuery: string
): Promise<ModelMessage[]> {
  const priorRows = await AiReportSessionMessage.find({ user: userId, sessionId })
    .sort({ createdAt: -1 })
    .limit(MAX_CONTEXT_TURNS)
    .select({ queryTextInternal: 1, queryText: 1, toolRequest: 1 })
    .lean();

  const chronological = priorRows.reverse();

  const history: ModelMessage[] = chronological.flatMap((row) => [
    { role: "user", content: row.queryTextInternal || row.queryText },
    { role: "assistant", content: JSON.stringify(row.toolRequest) },
  ]);

  return [...history, { role: "user", content: newQuery }];
}

/**
 * Turn a validated plan step into the executable step shape shared with
 * executeFindQuery / executeAggregateQuery and the response renderer.
 */
function normalizeStep(planStep: z.infer<typeof PlanStepSchema>, index: number) {
  const args = planStep.args;
  const isFind = planStep.tool === "findContacts";

  // Model-provided populate paths that reach into User docs are rewritten
  // to select-limited object form so populate can never pull sensitive
  // user fields.
  const populate: any[] = (args.populate ?? []).map((path) =>
    path.includes("user") ? { path, select: "name email" } : path
  );

  const step = {
    id: `step-${index + 1}`,
    type: isFind ? "find" : "aggregate",
    toolName: planStep.tool,
    purpose: planStep.purpose,
    filterActions: isFind ? args.filterActions ?? [] : [],
    aggregateActions: isFind ? [] : args.aggregateActions ?? [],
    projection:
      args.projection ?? (isFind ? { name: 1, email: 1, phone: 1, createdAt: 1 } : null),
    sort: args.sort ?? (isFind ? { createdAt: -1 } : null),
    // Only honored when the model explicitly set it (top/first N requests).
    limit: typeof args.limit === "number" ? args.limit : null,
    populate,
    ui: {
      type: args.ui?.type ?? (isFind ? "table" : "stat_table"),
      title: args.ui?.title ?? null,
    },
  };

  // The "main rule": every filtered field must appear in the projection.
  ensureProjectionCoversFilters(step);

  return step;
}

function serializeForStorage(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

const OBJECT_ID_LIKE = /^[a-f0-9]{24}$/i;

/**
 * Recursively drop id-ish keys so raw ObjectIds never reach the explainer.
 * Grouped aggregates carry their category label in `_id` (source name,
 * date bucket, ...) — those are kept under a `group` key; only
 * ObjectId-shaped values are dropped. Rows are already JSON-serialized
 * here, so ObjectIds appear as 24-hex strings.
 */
function stripIds(value: any): any {
  if (Array.isArray(value)) return value.map(stripIds);
  if (value && typeof value === "object") {
    const next: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      if (key === "__v") continue;
      if (typeof val === "string" && OBJECT_ID_LIKE.test(val)) continue;
      if (key === "_id") {
        next.group = stripIds(val);
        continue;
      }
      next[key] = stripIds(val);
    }
    return next;
  }
  return value;
}

/** Compact per-step summary for the explainer — never the full dataset. */
function summarizeResult(step: any, rows: any[], totalCount: number) {
  return {
    purpose: step.purpose || step.ui?.title || step.toolName,
    tool: step.toolName,
    rowCount: totalCount,
    rowsShownToUser: rows.length,
    sampleRows: rows.slice(0, SAMPLE_ROWS_FOR_EXPLAINER).map((row) => {
      const compact = { ...row };
      delete compact.activities;
      delete compact.remarks;
      delete compact.user;
      return stripIds(compact);
    }),
  };
}

// ── Route ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof authenticate>>;
  let userQueryInternal: string;
  let userQueryDisplay: string;
  let sessionId: string;

  // Auth/body problems surface as plain JSON status responses — the
  // stream only starts once the request is actually runnable.
  try {
    await dbConnect();
    auth = await authenticate(request);

    const body = await request.json();
    userQueryInternal = body.query?.trim();
    userQueryDisplay = body.queryDisplay?.trim() || userQueryInternal;
    sessionId = normalizeSessionId(body.sessionId);

    if (!userQueryInternal) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[AI Run Auth Error]", err);
    if (err.message?.includes("login") || err.message?.includes("not found")) {
      return NextResponse.json({ error: "Authentication required", message: err.message }, { status: 401 });
    }
    if (err.message === "Not allowed") {
      return NextResponse.json({ error: "Forbidden", message: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Bad request", message: err.message || "Internal error" }, { status: 400 });
  }

  const { currentUser, realUserId } = auth;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const emit = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected — stop emitting; the flow below bails out
          // via `closed` checks and the message is not persisted.
          closed = true;
        }
      };

      try {
        emit("session", { sessionId });

        // ── PLAN ─────────────────────────────────────────────────
        const messages = await buildConversationMessages(sessionId, realUserId, userQueryInternal);
        const model = gateway(PLANNER_MODEL);

        let plan: Pipeline | null = null;
        let rawPlan: Pipeline | null = null;
        let issues: string[] = [];
        let planUsage: unknown = null;

        for (let attempt = 0; attempt < 2 && !plan; attempt++) {
          const attemptMessages: ModelMessage[] =
            attempt === 0 || !rawPlan
              ? messages
              : [
                  ...messages,
                  { role: "assistant", content: JSON.stringify(rawPlan) },
                  {
                    role: "user",
                    content: `Your pipeline failed validation:\n${issues.join("\n")}\nReturn a corrected pipeline.`,
                  },
                ];

          const result = await generateObject({
            model,
            system: PLANNER_PROMPT,
            messages: attemptMessages,
            schema: PipelineSchema,
            temperature: 0.15,
            // Strict JSON-schema mode rejects the z.record() projection/sort
            // maps this schema legitimately needs.
            providerOptions: { openai: { strictJsonSchema: false } },
          });

          rawPlan = PipelineSchema.parse(result.object);
          planUsage = result.usage;
          issues = validatePipeline(rawPlan);
          if (issues.length === 0) plan = rawPlan;
        }

        if (!plan) {
          emit("error", {
            message: `The AI could not produce a valid query plan. ${issues.slice(0, 3).join("; ")}`,
          });
          controller.close();
          return;
        }

        // A non-ok outcome never executes, so don't surface steps the
        // model contradictorily attached to it.
        const steps =
          plan.outcome === "ok"
            ? plan.steps.map((planStep, index) => normalizeStep(planStep, index))
            : [];

        emit("plan", {
          outcome: plan.outcome,
          steps: steps.map((step) => ({
            id: step.id,
            tool: step.toolName,
            purpose: step.purpose,
            ui: step.ui,
          })),
        });

        // ── EXECUTE ──────────────────────────────────────────────
        const results: Array<{ id: string; step: any; data: any[]; meta: { count: number } }> = [];
        const summaries: any[] = [];

        if (plan.outcome === "ok") {
          for (const step of steps) {
            if (closed) return;
            emit("step_start", { id: step.id });

            try {
              const data =
                step.toolName === "findContacts"
                  ? await executeFindQuery(Contact, step, realUserId)
                  : await executeAggregateQuery(step, realUserId);

              const plainRows: any[] = serializeForStorage(data);
              const cap = step.limit ? Math.min(step.limit, MAX_ROWS_PER_STEP) : MAX_ROWS_PER_STEP;
              // IDs stay IDs for querying; anything leaving the backend
              // for the user speaks in names (stage/pipeline/user labels).
              const rows = await resolveDisplayNames(step, plainRows.slice(0, cap));
              const result = { id: step.id, step, data: rows, meta: { count: plainRows.length } };

              results.push(result);
              summaries.push(summarizeResult(step, rows, plainRows.length));
              emit("step_result", result);
            } catch (stepError: any) {
              console.error("[AI Step Error]", step.id, stepError);
              summaries.push({
                purpose: step.purpose,
                tool: step.toolName,
                error: "step failed to execute",
              });
              emit("step_error", { id: step.id, message: "This step failed to execute." });
            }
          }
        }

        // ── EXPLAIN ──────────────────────────────────────────────
        let explanation = "";

        if (!closed) {
          const explainerInput = {
            // Display form of the question (@users:Name, not @users:<id>) so
            // the explainer talks in names — raw IDs never reach it.
            question: userQueryDisplay || userQueryInternal,
            outcome: plan.outcome,
            results: summaries,
          };

          const textResult = streamText({
            model: gateway(EXPLAINER_MODEL),
            system: EXPLAINER_PROMPT,
            prompt: JSON.stringify(explainerInput),
            temperature: 0.3,
          });

          for await (const delta of textResult.textStream) {
            if (closed) break;
            explanation += delta;
            emit("text_delta", { delta });
          }
        }

        if (closed) return;

        // ── PERSIST (only on successful completion) ──────────────
        const response = {
          success: true,
          sessionId,
          outcome: plan.outcome,
          results: results.map(({ step, data, meta }) => ({ step, data, meta })),
          explanation,
          rawPrompt: userQueryDisplay,
          rawPromptInternal: userQueryInternal,
          toolRequest: plan,
          usage: planUsage,
        };

        await AiReportSessionMessage.create({
          user: currentUser._id,
          sessionId,
          queryText: userQueryDisplay || userQueryInternal,
          queryTextDisplay: userQueryDisplay,
          queryTextInternal: userQueryInternal,
          toolRequest: serializeForStorage(plan),
          response: serializeForStorage(response),
        });

        try {
          await AiReportSession.findOneAndUpdate(
            { user: currentUser._id, sessionId },
            {
              $setOnInsert: { title: (userQueryDisplay || userQueryInternal).slice(0, 80) },
              $set: { lastMessageAt: new Date() },
              $inc: { messageCount: 1 },
            },
            { upsert: true }
          );
        } catch (sessionIndexError) {
          console.error("[AI Session Index Error]", sessionIndexError);
        }

        emit("done", { sessionId, usage: planUsage });
      } catch (err: any) {
        console.error("[AI Run Error]", err);
        emit("error", { message: err.message || "Run execution failed" });
      } finally {
        if (!closed) {
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export const runtime = "nodejs";
export const maxDuration = 60;
