import mongoose, { Schema, Types } from "mongoose";

export interface IAiQueryHistory {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  queryText: string;
  queryTextDisplay?: string;
  queryTextInternal?: string;
  queryHash: string;
  querySpec: Record<string, unknown>;
  response?: Record<string, unknown>;
  uiType?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastUsedAt?: Date;
}

const aiQueryHistorySchema = new Schema<IAiQueryHistory>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    queryText: { type: String, required: true },
    queryTextDisplay: { type: String, required: false },
    queryTextInternal: { type: String, required: false },
    queryHash: { type: String, required: true, index: true },
    querySpec: { type: Object, required: true },
    response: { type: Object, required: false },
    uiType: { type: String, required: false },
    lastUsedAt: { type: Date, required: false },
  },
  { timestamps: true }
);

aiQueryHistorySchema.index({ user: 1, queryHash: 1 }, { unique: true });

const AiQueryHistory =
  mongoose.models.AiQueryHistory ||
  mongoose.model<IAiQueryHistory>("AiQueryHistory", aiQueryHistorySchema);

export default AiQueryHistory;
