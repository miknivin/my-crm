import mongoose from "mongoose";

export interface ByStageAssignedToFilter {
  _id: string;
  isNot: boolean;
}

export interface ByStageActivityFilter {
  value: string;
  isNot: boolean;
}

export interface ParsedByStageParams {
  pipelineId: string;
  stageId: string;
  source?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  assignedTo: ByStageAssignedToFilter[];
  activities: ByStageActivityFilter[];
  page: number;
  limit: number;
  pipelineObjectId: mongoose.Types.ObjectId;
  stageObjectId: mongoose.Types.ObjectId;
}

export const VALID_ACTIVITIES = [
  "HAD_CONVERSATION",
  "CALLED_NOT_PICKED",
  "CALLED_INVALID",
  "CALLED_SWITCHED_OFF",
  "WHATSAPP_COMMUNICATED",
  "ONLINE_MEETING_SCHEDULED",
  "OFFLINE_MEETING_SCHEDULED",
  "ONLINE_MEETING_CONFIRMED",
  "OFFLINE_MEETING_CONFIRMED",
  "PROPOSAL_SHARED",
  "PAYMENT_DONE_ADVANCE",
  "PAYMENT_DONE_PENDING",
  "FULL_PAYMENT_DONE",
  "PAYMENT_DONE_MONTHLY",
  "OTHER",
  "NO_ACTIVITY_RECORDED",
] as const;

export class ByStageApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
