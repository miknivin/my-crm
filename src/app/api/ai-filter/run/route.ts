/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { isAuthenticatedUser } from "../../middlewares/auth";
import AiReportSessionMessage from "@/app/models/AiReportSessionMessage";
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

const ToolArgsSchema = z.object({
  filterActions: z
    .array(z.object({ method: FilterMethodSchema, args: z.array(z.any()).optional() }))
    .default([]),
  aggregateActions: z
    .array(z.object({ method: AggregateMethodSchema, args: z.array(z.any()).optional() }))
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

    const model = gateway("openai/gpt-4.1");
    const result = await generateObject({
      model,
      system: TOOL_PROMPT,
      prompt: userQueryInternal,
      schema: ToolRequestSchema,
      temperature: 0.15,
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

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("[AI Run Error]", err);

    if (err.message?.includes("login") || err.message?.includes("not found")) {
      return NextResponse.json({ error: "Authentication required", message: err.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Run execution failed", message: err.message || "Internal error" }, { status: 400 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 45;
