/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateObject, type ModelMessage } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { isAuthenticatedUser, authorizeRoles } from "../../middlewares/auth";
import AiReportSessionMessage from "@/app/models/AiReportSessionMessage";
import AiReportSession from "@/app/models/AiReportSession";
import Contact from "@/app/models/Contact";

import dbConnect from "@/app/lib/db/connection";
import { TOOL_PROMPT } from "@/app/lib/ai/toolPrompt";

import { executeFindQuery } from "@/helpers/executeFindQuery";
import { executeAggregateQuery } from "@/helpers/executeAggregateQuery";

const FilterMethodSchema = z.enum([
  "eq",
  "ne",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "nin",
  "contains",
  "exists",
  "assignedTo",
  "assignedOnlyTo",
  "hasMultipleAssignees",
  "unassigned",
  "hasAnyAssignee",
  "isConverted",
  "hasSuccessStage",
  "notConverted",
]);

const AggregateMethodSchema = z.enum([
  "match",
  "filterByPipeline",
  "filterByStage",
  "filterByTag",
  "filterByAssignedUser",
  "filterBySource",
  "filterByCreatedAt",
  "filterConverted",
  "groupByPipeline",
  "groupByStage",
  "groupByTag",
  "groupByAssignedUser",
  "groupBySource",
  "groupByTime",
  "count",
  "sum",
  "avg",
  "sort",
  "limit",
]);

const UiSchema = z.object({
  type: z.enum(["table", "stat_card", "stat_table", "chart_trend"]).default("table"),
  title: z.string().nullable().optional(),
});

// OpenAI's structured-output validator requires arrays to declare a concrete
// `items` schema — z.array(z.any()) doesn't produce one and gets rejected
// with "array schema missing items". Builder args are always primitives or
// arrays of primitives (e.g. eq("stage", "New") or in("stage", ["a","b"])),
// so a bounded union covers every real case while staying schema-valid.
const ActionArgValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string(), z.number()])),
]);

const ToolArgsSchema = z.object({
  filterActions: z
    .array(z.object({ method: FilterMethodSchema, args: z.array(ActionArgValueSchema).optional() }))
    .default([]),
  aggregateActions: z
    .array(z.object({ method: AggregateMethodSchema, args: z.array(ActionArgValueSchema).optional() }))
    .default([]),
  projection: z.record(z.number()).nullable().optional(),
  sort: z.record(z.number()).nullable().optional(),
  limit: z.number().nullable().optional(),
  populate: z.array(z.string()).default([]),
  ui: UiSchema.default({ type: "table" }),
});

const ToolRequestSchema = z.object({
  toolName: z.enum(["findContacts", "aggregateContacts"]),
  args: ToolArgsSchema,
});

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

const MAX_CONTEXT_TURNS = 6;

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

function normalizeStep(toolRequest: z.infer<typeof ToolRequestSchema>) {
  const args = toolRequest.args;
  const isFind = toolRequest.toolName === "findContacts";

  return {
    type: isFind ? "find" : "aggregate",
    filterActions: isFind ? args.filterActions ?? [] : [],
    aggregateActions: isFind ? [] : args.aggregateActions ?? [],
    projection:
      args.projection ??
      (isFind ? { name: 1, email: 1, phone: 1, createdAt: 1 } : null),
    sort: args.sort ?? (isFind ? { createdAt: -1 } : null),
    limit: typeof args.limit === "number" ? args.limit : 20,
    populate: args.populate ?? [],
    ui: {
      type: args.ui?.type ?? (isFind ? "table" : "stat_table"),
      title: args.ui?.title ?? null,
    },
    toolName: toolRequest.toolName,
  };
}

function assertToolCanExecute(toolRequest: z.infer<typeof ToolRequestSchema>) {
  if (toolRequest.toolName === "findContacts" && !toolRequest.args.filterActions) {
    throw new Error("findContacts requires filterActions");
  }

  if (toolRequest.toolName === "aggregateContacts" && !toolRequest.args.aggregateActions) {
    throw new Error("aggregateContacts requires aggregateActions");
  }
}

function serializeForStorage(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { currentUser, realUserId } = await authenticate(request);

    const body = await request.json();
    const userQueryInternal = body.query?.trim();
    const userQueryDisplay = body.queryDisplay?.trim() || userQueryInternal;
    const sessionId = normalizeSessionId(body.sessionId);

    if (!userQueryInternal) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const messages = await buildConversationMessages(sessionId, realUserId, userQueryInternal);

    const model = gateway("openai/gpt-4.1");
    const result = await generateObject({
      model,
      system: TOOL_PROMPT,
      messages,
      schema: ToolRequestSchema,
      temperature: 0.15,
      // The default strict JSON-schema mode rejects z.record()/optional()
      // fields (projection/sort maps, optional builder args) that this tool
      // schema legitimately needs. Falling back to lenient JSON mode avoids
      // having to redesign the schema around strict mode's constraints.
      providerOptions: { openai: { strictJsonSchema: false } },
    });

    if (!result.object) throw new Error("No tool request received");

    const toolRequest = ToolRequestSchema.parse(result.object);
    assertToolCanExecute(toolRequest);

    const step = normalizeStep(toolRequest);
    const data =
      toolRequest.toolName === "findContacts"
        ? await executeFindQuery(Contact, step, realUserId)
        : await executeAggregateQuery(step, realUserId);

    const response = {
      success: true,
      sessionId,
      results: [{ step, data }],
      rawPrompt: userQueryDisplay,
      rawPromptInternal: userQueryInternal,
      toolRequest,
      usage: result.usage,
    };

    await AiReportSessionMessage.create({
      user: currentUser._id,
      sessionId,
      queryText: userQueryDisplay || userQueryInternal,
      queryTextDisplay: userQueryDisplay,
      queryTextInternal: userQueryInternal,
      toolRequest: serializeForStorage(toolRequest),
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

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("[AI Run Error]", err);

    if (err.message?.includes("login") || err.message?.includes("not found")) {
      return NextResponse.json({ error: "Authentication required", message: err.message }, { status: 401 });
    }

    if (err.message === "Not allowed") {
      return NextResponse.json({ error: "Forbidden", message: err.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Run execution failed", message: err.message || "Internal error" }, { status: 400 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 45;
