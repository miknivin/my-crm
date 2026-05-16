import mongoose, { Document, Schema, Model, Types, model } from "mongoose";

interface ActivityArchive extends Document {
  contact: Types.ObjectId;
  action:
    | "CONTACT_CREATED"
    | "CONTACT_UPDATED"
    | "TAG_ADDED"
    | "TAG_REMOVED"
    | "NOTE_ADDED"
    | "NOTE_UPDATED"
    | "PIPELINE_UPDATED"
    | "ASSIGNED_TO_UPDATED";
  user: Types.ObjectId;
  details: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

type ActivityArchiveModel = Model<ActivityArchive>

const activityArchiveSchema = new Schema<ActivityArchive, ActivityArchiveModel>(
  {
    contact: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "CONTACT_CREATED",
        "CONTACT_UPDATED",
        "TAG_ADDED",
        "TAG_REMOVED",
        "NOTE_ADDED",
        "NOTE_UPDATED",
        "PIPELINE_UPDATED",
        "ASSIGNED_TO_UPDATED",
      ],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    details: {
      type: Object,
      default: {},
    },
    createdAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Index for efficient querying
activityArchiveSchema.index({ contact: 1, createdAt: -1 });

let ActivityArchive: ActivityArchiveModel;
try {
  ActivityArchive = mongoose.model<ActivityArchive, ActivityArchiveModel>("ActivityArchive");
} catch {
  ActivityArchive = model<ActivityArchive, ActivityArchiveModel>("ActivityArchive", activityArchiveSchema);
}

export default ActivityArchive;