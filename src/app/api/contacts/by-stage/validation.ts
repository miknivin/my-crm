import { NextRequest } from "next/server";
import mongoose from "mongoose";

import {
  ByStageActivityFilter,
  ByStageApiError,
  ByStageAssignedToFilter,
  ParsedByStageParams,
  VALID_ACTIVITIES,
} from "./types";

const safeJsonParseArray = <T>(value: string | null, label: string): T[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      throw new Error();
    }
    return parsed as T[];
  } catch {
    throw new ByStageApiError(`Invalid ${label} format`);
  }
};

export const parseAndValidateByStageParams = (req: NextRequest): ParsedByStageParams => {
  const { searchParams } = new URL(req.url);

  const pipelineId = searchParams.get("pipelineId") || "";
  const stageId = searchParams.get("stageId") || "";

  if (!pipelineId || !stageId) {
    throw new ByStageApiError("pipelineId and stageId are required");
  }

  if (!mongoose.Types.ObjectId.isValid(pipelineId) || !mongoose.Types.ObjectId.isValid(stageId)) {
    throw new ByStageApiError("Invalid pipelineId or stageId");
  }

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (Number.isNaN(page) || page < 1) {
    throw new ByStageApiError("Invalid page number");
  }

  if (Number.isNaN(limit) || limit < 1 || limit > 100) {
    throw new ByStageApiError("Invalid limit (must be 1-100)");
  }

  const source = searchParams.get("source") || undefined;
  const keyword = searchParams.get("keyword") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  if (startDate && Number.isNaN(Date.parse(startDate))) {
    throw new ByStageApiError("Invalid startDate format");
  }

  if (endDate && Number.isNaN(Date.parse(endDate))) {
    throw new ByStageApiError("Invalid endDate format");
  }

  const assignedTo = safeJsonParseArray<ByStageAssignedToFilter>(searchParams.get("assignedTo"), "assignedTo");
  const activities = safeJsonParseArray<ByStageActivityFilter>(searchParams.get("activities"), "activities");

  for (const item of assignedTo) {
    if (!item?._id || typeof item.isNot !== "boolean" || !mongoose.Types.ObjectId.isValid(item._id)) {
      throw new ByStageApiError("Invalid assignedTo format");
    }
  }

  for (const item of activities) {
    if (!item?.value || typeof item.isNot !== "boolean") {
      throw new ByStageApiError("Invalid activities format");
    }
    if (!VALID_ACTIVITIES.includes(item.value as (typeof VALID_ACTIVITIES)[number])) {
      throw new ByStageApiError(`Invalid activity values: ${item.value}`);
    }
  }

  return {
    pipelineId,
    stageId,
    source,
    keyword,
    startDate,
    endDate,
    assignedTo,
    activities,
    page,
    limit,
    pipelineObjectId: new mongoose.Types.ObjectId(pipelineId),
    stageObjectId: new mongoose.Types.ObjectId(stageId),
  };
};
