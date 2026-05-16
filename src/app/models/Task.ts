import mongoose, { Document, Model, Schema } from "mongoose";

export type TaskType = "contact_linked" | "custom";
export type TaskStatus = "open" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface ITask extends Document {
  title: string;
  description?: string;
  type: TaskType;
  contactId?: mongoose.Types.ObjectId | null;
  assignedTo: mongoose.Types.ObjectId[];
  dueDate?: Date | null;
  dueTime?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  owner: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [255, "Title cannot exceed 255 characters"],
    },
    description: { type: String, trim: true, default: null },
    type: {
      type: String,
      enum: ["contact_linked", "custom"] satisfies TaskType[],
      required: [true, "Task type is required"],
    },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", default: null },
    assignedTo: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    dueDate: { type: Date, default: null },
    dueTime: {
      type: String,
      trim: true,
      default: null,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "dueTime must be in HH:mm format"],
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"] satisfies TaskPriority[],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "done"] satisfies TaskStatus[],
      default: "open",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "owner is required"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "createdBy is required"],
    },
  },
  { timestamps: true, collection: "tasks" }
);

TaskSchema.index({ assignedTo: 1, status: 1, dueDate: 1 });
TaskSchema.index({ contactId: 1, status: 1 });
TaskSchema.index({ owner: 1, createdAt: -1 });
TaskSchema.index({ createdBy: 1, createdAt: -1 });
TaskSchema.index({ dueDate: 1, status: 1 });

TaskSchema.pre("validate", function (next) {
  if (!this.owner && this.createdBy) {
    this.owner = this.createdBy;
  }
  if (this.type === "contact_linked" && !this.contactId) {
    this.invalidate("contactId", "contactId is required when type is contact_linked");
  }
  if (this.type === "custom" && this.contactId) {
    this.invalidate("contactId", "contactId must be null when type is custom");
  }
  next();
});

const Task: Model<ITask> =
  mongoose.models.Task ?? mongoose.model<ITask>("Task", TaskSchema);

export default Task;
