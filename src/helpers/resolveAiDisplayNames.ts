/* eslint-disable @typescript-eslint/no-explicit-any */
import Stage from "@/app/models/Stage";
import Pipeline from "@/app/models/Pipeline";
import User from "@/app/models/User";

const OBJECT_ID_LIKE = /^[a-f0-9]{24}$/i;

const isIdString = (value: unknown): value is string =>
  typeof value === "string" && OBJECT_ID_LIKE.test(value);

async function buildNameMap(model: any, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const docs = await model
    .find({ _id: { $in: ids } })
    .select({ name: 1 })
    .lean();
  return new Map(docs.map((doc: any) => [String(doc._id), doc.name as string]));
}

const GROUP_LABEL_SOURCES: Record<string, { model: any; emptyLabel: string }> = {
  groupByStage: { model: Stage, emptyLabel: "No stage" },
  groupByPipeline: { model: Pipeline, emptyLabel: "No pipeline" },
  groupByAssignedUser: { model: User, emptyLabel: "Unassigned" },
};

/**
 * Resolve raw ObjectIds in step OUTPUT rows to human-readable names.
 *
 * IDs are the right currency between backend and DB — queries keep using
 * them untouched. But anything shown to the user must speak in names, so
 * this runs at the response boundary, after execution and serialization:
 *
 * 1. group-by aggregate rows keyed by an id (`groupByStage`,
 *    `groupByPipeline`, `groupByAssignedUser`) get `_id` replaced with the
 *    entity's name (charts/tables then label by name).
 * 2. `pipelinesActive` entries inside record rows are reshaped from
 *    `{pipeline_id, stage_id, order}` to `{pipeline, stage, order}` names.
 */
export async function resolveDisplayNames(step: any, rows: any[]): Promise<any[]> {
  if (rows.length === 0) return rows;
  let next = rows;

  // 1) Group-by labels
  const groupMethod = (step.aggregateActions ?? []).find((action: any) =>
    action.method?.startsWith("groupBy")
  )?.method;
  const labelSource = groupMethod ? GROUP_LABEL_SOURCES[groupMethod] : undefined;

  if (labelSource) {
    const ids = next.map((row) => row._id).filter(isIdString);
    const nameById = await buildNameMap(labelSource.model, ids);
    next = next.map((row) => {
      if (row._id == null) return { ...row, _id: labelSource.emptyLabel };
      if (isIdString(row._id)) return { ...row, _id: nameById.get(row._id) ?? "Unknown" };
      return row;
    });
  }

  // 2) pipelinesActive stage/pipeline names inside record rows
  const hasPipelines = next.some(
    (row) => Array.isArray(row.pipelinesActive) && row.pipelinesActive.length > 0
  );

  if (hasPipelines) {
    const stageIds = new Set<string>();
    const pipelineIds = new Set<string>();

    for (const row of next) {
      for (const entry of row.pipelinesActive ?? []) {
        if (isIdString(entry?.stage_id)) stageIds.add(entry.stage_id);
        if (isIdString(entry?.pipeline_id)) pipelineIds.add(entry.pipeline_id);
      }
    }

    const [stageNames, pipelineNames] = await Promise.all([
      buildNameMap(Stage, [...stageIds]),
      buildNameMap(Pipeline, [...pipelineIds]),
    ]);

    next = next.map((row) => {
      if (!Array.isArray(row.pipelinesActive) || row.pipelinesActive.length === 0) return row;
      return {
        ...row,
        pipelinesActive: row.pipelinesActive.map((entry: any) => ({
          pipeline: pipelineNames.get(entry?.pipeline_id) ?? "Unknown",
          stage: stageNames.get(entry?.stage_id) ?? "Unknown",
          order: entry?.order,
        })),
      };
    });
  }

  return next;
}
