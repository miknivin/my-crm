/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";

import ActivityLog from "@/app/models/ActivityLog";

import { ParsedByStageParams } from "./types";

const buildActivityIdSet = async (activities: string[]) => {
  if (activities.length === 0) return [] as mongoose.Types.ObjectId[];

  const responses = await ActivityLog.find({ event: { $in: activities } })
    .select("contactId")
    .lean();

  return responses.map((item) => item.contactId as mongoose.Types.ObjectId);
};

export const buildByStageMatchQuery = async (params: ParsedByStageParams, user: any) => {
  const matchQuery: Record<string, any> = {
    pipelinesActive: {
      $elemMatch: {
        pipeline_id: params.pipelineObjectId,
        stage_id: params.stageObjectId,
      },
    },
  };

  if (user?.role === "team_member") {
    matchQuery["assignedTo.user"] = new mongoose.Types.ObjectId(user._id);
  } else if (params.assignedTo.length > 0) {
    const includeIds = params.assignedTo
      .filter((item) => !item.isNot)
      .map((item) => new mongoose.Types.ObjectId(item._id));
    const excludeIds = params.assignedTo
      .filter((item) => item.isNot)
      .map((item) => new mongoose.Types.ObjectId(item._id));

    if (includeIds.length > 0 || excludeIds.length > 0) {
      matchQuery["assignedTo.user"] = {};
      if (includeIds.length > 0) matchQuery["assignedTo.user"].$in = includeIds;
      if (excludeIds.length > 0) matchQuery["assignedTo.user"].$nin = excludeIds;
    }
  }

  if (params.source) {
    matchQuery.source = params.source;
  }

  if (params.keyword) {
    const regex = new RegExp(params.keyword, "i");
    matchQuery.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { notes: regex },
      { businessName: regex },
    ];
  }

  if (params.startDate || params.endDate) {
    matchQuery.createdAt = {};

    if (params.startDate) {
      const start = new Date(params.startDate);
      start.setHours(0, 0, 0, 0);
      matchQuery.createdAt.$gte = start;
    }

    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      matchQuery.createdAt.$lte = end;
    }
  }

  if (params.activities.length > 0) {
    const noActivityFilters = params.activities.filter((item) => item.value === "NO_ACTIVITY_RECORDED");
    const regularFilters = params.activities.filter((item) => item.value !== "NO_ACTIVITY_RECORDED");

    if (noActivityFilters.length > 0) {
      const wantsNo = noActivityFilters.some((item) => !item.isNot);
      const wantsHas = noActivityFilters.some((item) => item.isNot);

      if (wantsNo && wantsHas) {
        throw new Error("Cannot combine 'No activity recorded' with 'Not No activity recorded'");
      }

      if (wantsNo) {
        matchQuery.activities = { $size: 0 };
      } else if (wantsHas) {
        matchQuery.activities = { $exists: true, $ne: [], $not: { $size: 0 } };
      }
    }

    if (regularFilters.length > 0) {
      const includeActivities = regularFilters.filter((item) => !item.isNot).map((item) => item.value);
      const excludeActivities = regularFilters.filter((item) => item.isNot).map((item) => item.value);

      const [includeIds, excludeIds] = await Promise.all([
        buildActivityIdSet(includeActivities),
        buildActivityIdSet(excludeActivities),
      ]);

      if (includeActivities.length > 0 && includeIds.length === 0) {
        return { matchQuery, forceEmpty: true };
      }

      if (includeIds.length > 0) {
        matchQuery._id = matchQuery._id ? { ...matchQuery._id, $in: includeIds } : { $in: includeIds };
      }

      if (excludeIds.length > 0) {
        matchQuery._id = matchQuery._id ? { ...matchQuery._id, $nin: excludeIds } : { $nin: excludeIds };
      }
    }
  }

  return { matchQuery, forceEmpty: false };
};
