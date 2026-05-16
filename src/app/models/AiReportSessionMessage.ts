import mongoose, { Schema, Types } from "mongoose";

export interface IAiReportSessionMessage {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  sessionId: string;
  queryText: string;
  queryTextDisplay?: string;
  queryTextInternal?: string;
  toolRequest: Record<string, unknown>;
  response: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

const aiReportSessionMessageSchema = new Schema<IAiReportSessionMessage>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    queryText: { type: String, required: true },
    queryTextDisplay: { type: String, required: false },
    queryTextInternal: { type: String, required: false },
    toolRequest: { type: Object, required: true },
    response: { type: Object, required: true },
  },
  { timestamps: true }
);

aiReportSessionMessageSchema.index({ user: 1, sessionId: 1, createdAt: -1 });

const AiReportSessionMessage =
  mongoose.models.AiReportSessionMessage ||
  mongoose.model<IAiReportSessionMessage>(
    "AiReportSessionMessage",
    aiReportSessionMessageSchema
  );

export default AiReportSessionMessage;
