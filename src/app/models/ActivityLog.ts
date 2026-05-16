import mongoose, { Document, Model, Schema } from "mongoose";

export type ActivityLogEvent =
  | "CONTACT_CREATED"
  | "PIPELINE_STAGE_CHANGED"
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_DELETED"
  | "REMARK_ADDED";

export interface IActivityLog extends Document {
  contactId: mongoose.Types.ObjectId;
  event: ActivityLogEvent;
  description: string;
  performedBy: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    contactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: [true, "contactId is required"],
    },
    event: {
      type: String,
      required: [true, "Activity event is required"],
      enum: [
        "CONTACT_CREATED",
        "PIPELINE_STAGE_CHANGED",
        "TASK_CREATED",
        "TASK_UPDATED",
        "TASK_DELETED",
        "REMARK_ADDED",
      ] satisfies ActivityLogEvent[],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "performedBy is required"],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "activitylogs" }
);

ActivityLogSchema.index({ contactId: 1, createdAt: -1 });

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog ?? mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);

export default ActivityLog;
