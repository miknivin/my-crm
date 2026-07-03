import mongoose, { Schema, Types } from "mongoose";

export interface IAiReportSession {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  sessionId: string;
  title: string;
  lastMessageAt: Date;
  messageCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const aiReportSessionSchema = new Schema<IAiReportSession>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sessionId: { type: String, required: true },
    title: { type: String, required: true },
    lastMessageAt: { type: Date, required: true },
    messageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

aiReportSessionSchema.index({ user: 1, sessionId: 1 }, { unique: true });
aiReportSessionSchema.index({ user: 1, lastMessageAt: -1 });

const AiReportSession =
  mongoose.models.AiReportSession ||
  mongoose.model<IAiReportSession>("AiReportSession", aiReportSessionSchema);

export default AiReportSession;
