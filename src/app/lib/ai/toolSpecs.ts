/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Single source of truth for the AI report pipeline's tool surface.
 *
 * Both the planner prompt (via buildMethodDocs) and the server-side
 * validator (validatePipeline) are generated from the same specs, so the
 * documentation the model sees and the rules we enforce can never drift.
 * The specs mirror the REAL builder signatures in
 * `src/app/classes/MongoFilterBuilder.ts` and
 * `src/app/classes/ContactAggregationBuilder.ts`.
 */

// ── Field allowlist (from the Contact schema) ────────────────────────
// `user` is intentionally excluded: it's the tenant-isolation field and is
// injected server-side only. `activities`/`remarks` are excluded as noise.
export const FILTERABLE_FIELDS = [
  "name",
  "email",
  "phone",
  "businessName",
  "notes",
  "source",
  "uid",
  "probability",
  "value",
  "createdAt",
  "updatedAt",
  "tags.name",
  "assignedTo.user",
  "pipelinesActive.pipeline_id",
  "pipelinesActive.stage_id",
] as const;

const FIELD_ROOTS = new Set(FILTERABLE_FIELDS.map((f) => f.split(".")[0]));

type ArgType =
  | "field"
  | "primitive"
  | "string"
  | "number"
  | "boolean"
  | "objectId"
  | "primitiveArray"
  | "stringOrArray"
  | "date"
  | "unit";

interface ArgSpec {
  name: string;
  type: ArgType;
  optional?: boolean;
}

export interface MethodSpec {
  args: ArgSpec[];
  /**
   * Projection fields this method implicates. "fieldArg" means "whatever
   * field the first arg names"; a string[] is a fixed set of roots.
   */
  touches: "fieldArg" | string[];
  doc: string;
}

const TIME_UNITS = ["day", "week", "month", "year"];
const OBJECT_ID_RE = /[a-f0-9]{24}/i;

// ── Filter methods (MongoFilterBuilder, used by findContacts) ────────
export const FILTER_METHOD_SPECS: Record<string, MethodSpec> = {
  eq: { args: [{ name: "field", type: "field" }, { name: "value", type: "primitive" }], touches: "fieldArg", doc: "field equals value" },
  ne: { args: [{ name: "field", type: "field" }, { name: "value", type: "primitive" }], touches: "fieldArg", doc: "field not equal to value" },
  gt: { args: [{ name: "field", type: "field" }, { name: "value", type: "primitive" }], touches: "fieldArg", doc: "field greater than value" },
  gte: { args: [{ name: "field", type: "field" }, { name: "value", type: "primitive" }], touches: "fieldArg", doc: "field greater than or equal" },
  lt: { args: [{ name: "field", type: "field" }, { name: "value", type: "primitive" }], touches: "fieldArg", doc: "field less than value" },
  lte: { args: [{ name: "field", type: "field" }, { name: "value", type: "primitive" }], touches: "fieldArg", doc: "field less than or equal" },
  in: { args: [{ name: "field", type: "field" }, { name: "values", type: "primitiveArray" }], touches: "fieldArg", doc: "field is one of values" },
  nin: { args: [{ name: "field", type: "field" }, { name: "values", type: "primitiveArray" }], touches: "fieldArg", doc: "field is none of values" },
  contains: { args: [{ name: "field", type: "field" }, { name: "text", type: "string" }], touches: "fieldArg", doc: "field contains text (case-insensitive)" },
  exists: { args: [{ name: "field", type: "field" }, { name: "value", type: "boolean", optional: true }], touches: "fieldArg", doc: "field exists (or not, if value=false)" },
  assignedTo: { args: [{ name: "userId", type: "objectId" }], touches: ["assignedTo"], doc: "contact is assigned to this user (24-char id)" },
  assignedOnlyTo: { args: [{ name: "userId", type: "objectId" }], touches: ["assignedTo"], doc: "contact is assigned to ONLY this user" },
  hasMultipleAssignees: { args: [], touches: ["assignedTo"], doc: "contact has 2+ assignees" },
  unassigned: { args: [], touches: ["assignedTo"], doc: "contact has no assignee" },
  hasAnyAssignee: { args: [], touches: ["assignedTo"], doc: "contact has at least one assignee" },
  isConverted: { args: [], touches: ["pipelinesActive"], doc: "contact's latest stage is a success stage" },
  hasSuccessStage: { args: [], touches: ["pipelinesActive"], doc: "contact has reached any success stage" },
  notConverted: { args: [], touches: ["pipelinesActive"], doc: "contact has no success stage" },
};

// ── Aggregate methods (ContactAggregationBuilder, used by aggregateContacts) ──
// NOTE: `match` (raw Mongo filter injection), `sort` and `limit` (already
// step-level args) are deliberately NOT exposed to the model.
export const AGGREGATE_METHOD_SPECS: Record<string, MethodSpec> = {
  filterByPipeline: { args: [{ name: "pipelineId", type: "objectId" }], touches: ["pipelinesActive"], doc: "only contacts in this pipeline" },
  filterByStage: { args: [{ name: "stageId", type: "objectId" }], touches: ["pipelinesActive"], doc: "only contacts currently in this stage" },
  filterByTag: { args: [{ name: "tagNames", type: "stringOrArray" }], touches: ["tags"], doc: "only contacts having any of these tag names" },
  filterByAssignedUser: { args: [{ name: "userId", type: "objectId" }], touches: ["assignedTo"], doc: "only contacts assigned to this user (24-char id)" },
  filterBySource: { args: [{ name: "source", type: "stringOrArray" }], touches: ["source"], doc: "only contacts from these source(s)" },
  filterByCreatedAt: { args: [{ name: "from", type: "date", optional: true }, { name: "to", type: "date", optional: true }], touches: ["createdAt"], doc: "created within date range (ISO strings)" },
  filterConverted: { args: [], touches: ["pipelinesActive"], doc: "only contacts in a success stage" },
  groupByPipeline: { args: [], touches: [], doc: "group and count by pipeline" },
  groupByStage: { args: [], touches: [], doc: "group and count by stage" },
  groupByTag: { args: [], touches: [], doc: "group and count by tag name" },
  groupByAssignedUser: { args: [], touches: [], doc: "group and count by assigned user" },
  groupBySource: { args: [], touches: [], doc: "group and count by source" },
  groupByTime: { args: [{ name: "unit", type: "unit" }, { name: "field", type: "field", optional: true }], touches: [], doc: "group and count by time bucket (unit: day|week|month|year; field defaults to createdAt)" },
  count: { args: [], touches: [], doc: "count matching contacts (returns {total})" },
  sum: { args: [{ name: "field", type: "field" }, { name: "as", type: "string", optional: true }], touches: "fieldArg", doc: "sum a numeric field" },
  avg: { args: [{ name: "field", type: "field" }, { name: "as", type: "string", optional: true }], touches: "fieldArg", doc: "average a numeric field" },
};

// ── Validation ───────────────────────────────────────────────────────

interface ActionLike {
  method: string;
  args?: unknown[];
}

interface StepLike {
  toolName?: string;
  tool?: string;
  filterActions?: ActionLike[];
  aggregateActions?: ActionLike[];
  projection?: Record<string, number> | null;
  args?: {
    filterActions?: ActionLike[];
    aggregateActions?: ActionLike[];
    projection?: Record<string, number> | null;
  };
}

const isPrimitive = (v: unknown) =>
  typeof v === "string" || typeof v === "number" || typeof v === "boolean";

function validateArg(value: unknown, spec: ArgSpec, where: string): string | null {
  switch (spec.type) {
    case "field":
      if (typeof value !== "string" || !(FILTERABLE_FIELDS as readonly string[]).includes(value)) {
        return `${where}: "${String(value)}" is not a filterable field. Allowed: ${FILTERABLE_FIELDS.join(", ")}`;
      }
      return null;
    case "objectId":
      if (typeof value !== "string" || !OBJECT_ID_RE.test(value)) {
        return `${where}: expected a 24-character id, got "${String(value)}"`;
      }
      return null;
    case "string":
      return typeof value === "string" ? null : `${where}: expected a string`;
    case "number":
      return typeof value === "number" ? null : `${where}: expected a number`;
    case "boolean":
      return typeof value === "boolean" ? null : `${where}: expected a boolean`;
    case "primitive":
      return isPrimitive(value) ? null : `${where}: expected a string/number/boolean`;
    case "primitiveArray":
      return Array.isArray(value) && value.every(isPrimitive)
        ? null
        : `${where}: expected an array of primitives`;
    case "stringOrArray":
      if (typeof value === "string") return null;
      return Array.isArray(value) && value.every((v) => typeof v === "string")
        ? null
        : `${where}: expected a string or array of strings`;
    case "date":
      return typeof value === "string" && !Number.isNaN(new Date(value).getTime())
        ? null
        : `${where}: expected an ISO date string`;
    case "unit":
      return typeof value === "string" && TIME_UNITS.includes(value)
        ? null
        : `${where}: expected one of ${TIME_UNITS.join("|")}`;
  }
}

function validateActions(
  actions: ActionLike[],
  specs: Record<string, MethodSpec>,
  bucket: string,
  stepLabel: string
): string[] {
  const issues: string[] = [];

  for (const action of actions) {
    const spec = specs[action.method];
    const where = `${stepLabel} ${bucket}.${action.method}`;

    if (!spec) {
      issues.push(`${where}: unknown method. Allowed: ${Object.keys(specs).join(", ")}`);
      continue;
    }

    const args = action.args ?? [];
    const required = spec.args.filter((a) => !a.optional).length;

    if (args.length < required || args.length > spec.args.length) {
      const signature = spec.args.map((a) => a.name + (a.optional ? "?" : "")).join(", ");
      issues.push(`${where}: expects (${signature}) but got ${args.length} arg(s)`);
      continue;
    }

    args.forEach((value, index) => {
      const argSpec = spec.args[index];
      if (!argSpec) return;
      const issue = validateArg(value, argSpec, `${where} arg "${argSpec.name}"`);
      if (issue) issues.push(issue);
    });
  }

  return issues;
}

/**
 * Semantic validation of a planned pipeline, beyond what the Zod shape
 * check can express. Returns human/model-readable issue strings (empty =
 * valid) precise enough to feed back for a repair retry.
 */
export function validatePipeline(plan: { steps: StepLike[] }): string[] {
  const issues: string[] = [];

  plan.steps.forEach((step, index) => {
    const label = `step ${index + 1}`;
    const tool = step.tool ?? step.toolName;
    const args = step.args ?? step;
    const filterActions = args.filterActions ?? [];
    const aggregateActions = args.aggregateActions ?? [];

    if (tool === "findContacts") {
      if (aggregateActions.length > 0) {
        issues.push(`${label}: findContacts must use filterActions, not aggregateActions`);
      }
      issues.push(...validateActions(filterActions, FILTER_METHOD_SPECS, "filterActions", label));
    } else if (tool === "aggregateContacts") {
      if (filterActions.length > 0) {
        issues.push(`${label}: aggregateContacts must use aggregateActions, not filterActions`);
      }
      if (aggregateActions.length === 0) {
        issues.push(`${label}: aggregateContacts requires at least one aggregateAction`);
      }
      issues.push(...validateActions(aggregateActions, AGGREGATE_METHOD_SPECS, "aggregateActions", label));
    } else {
      issues.push(`${label}: unknown tool "${String(tool)}"`);
    }

    const projection = args.projection;
    if (projection) {
      const values = Object.entries(projection).filter(([key]) => key !== "_id");
      if (values.some(([, v]) => v === 0)) {
        issues.push(`${label}: use inclusion projections only ({field: 1}), never exclusions ({field: 0})`);
      }
      for (const [key] of values) {
        if (!FIELD_ROOTS.has(key.split(".")[0])) {
          issues.push(`${label}: projection field "${key}" is not a known contact field`);
        }
      }
    }
  });

  return issues;
}

// ── The "main rule": projection must cover filtered fields ───────────

const actionTouchedRoots = (actions: ActionLike[], specs: Record<string, MethodSpec>): string[] => {
  const roots: string[] = [];
  for (const action of actions) {
    const spec = specs[action.method];
    if (!spec) continue;
    if (spec.touches === "fieldArg") {
      const field = action.args?.[0];
      if (typeof field === "string") roots.push(field.split(".")[0]);
    } else {
      roots.push(...spec.touches);
    }
  }
  return roots;
};

/**
 * Deterministically enforce that every field a filter touches appears in
 * the step's projection, so the user can validate the output against the
 * query (filter by assignedTo → rows must show assignedTo). Also ensures
 * assignedTo gets populated so names render instead of raw ObjectIds.
 *
 * Mutation is collision-safe: a root is only added when the projection
 * doesn't already include it (directly or via a dotted child), because
 * Mongo rejects projections containing both "tags" and "tags.name".
 */
export function ensureProjectionCoversFilters(step: {
  toolName: string;
  filterActions: ActionLike[];
  aggregateActions: ActionLike[];
  projection: Record<string, number> | null;
  populate: any[];
}): void {
  const hasGroup = step.aggregateActions.some((a) => a.method.toLowerCase().includes("group") || a.method === "count" || a.method === "sum" || a.method === "avg");
  // Grouped/aggregated output reshapes rows entirely — projection rule
  // only applies to record-shaped output.
  if (step.toolName !== "findContacts" && hasGroup) return;

  const touched =
    step.toolName === "findContacts"
      ? actionTouchedRoots(step.filterActions, FILTER_METHOD_SPECS)
      : actionTouchedRoots(step.aggregateActions, AGGREGATE_METHOD_SPECS);

  if (touched.length === 0 && !step.projection) return;

  const projection: Record<string, number> = { ...(step.projection ?? {}) };
  const keys = Object.keys(projection);

  for (const root of touched) {
    const covered = keys.some((key) => key === root || key.startsWith(`${root}.`));
    if (!covered) {
      projection[root] = 1;
      keys.push(root);
    }
  }

  step.projection = projection;

  const wantsAssignees = keys.some((key) => key === "assignedTo" || key.startsWith("assignedTo."));
  if (step.toolName === "findContacts" && wantsAssignees) {
    const alreadyPopulated = step.populate.some((p) =>
      typeof p === "string" ? p.startsWith("assignedTo") : p?.path?.startsWith("assignedTo")
    );
    if (!alreadyPopulated) {
      // Object form so only safe display fields are pulled from User.
      step.populate.push({ path: "assignedTo.user", select: "name email" });
    }
  }
}

// ── Prompt generation ────────────────────────────────────────────────

const renderSpecDocs = (specs: Record<string, MethodSpec>): string =>
  Object.entries(specs)
    .map(([name, spec]) => {
      const signature = spec.args.map((a) => a.name + (a.optional ? "?" : "")).join(", ");
      return `- ${name}(${signature}) — ${spec.doc}`;
    })
    .join("\n");

export function buildMethodDocs(): string {
  return [
    "findContacts filterActions (list/search record queries):",
    renderSpecDocs(FILTER_METHOD_SPECS),
    "",
    "aggregateContacts aggregateActions (counts/grouping/analytics):",
    renderSpecDocs(AGGREGATE_METHOD_SPECS),
    "",
    `Filterable fields: ${FILTERABLE_FIELDS.join(", ")}`,
  ].join("\n");
}
