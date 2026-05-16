import mongoose, { Document, Schema, model } from "mongoose";

export interface IProposalItemSnapshot {
  serviceId: mongoose.Types.ObjectId;
  serviceName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  currency: "INR" | "USD" | "EUR" | "GBP";
}

export interface IProposal extends Document {
  contactId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  version: number;
  proposalNumber: string;
  snapshot: Record<string, unknown>;
  items: IProposalItemSnapshot[];
  totals: {
    subtotal: number;
    advance: number;
    balance: number;
    currency: "INR" | "USD" | "EUR" | "GBP";
  };
  createdAt: Date;
  updatedAt: Date;
}

const proposalItemSchema = new Schema<IProposalItemSnapshot>(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["INR", "USD", "EUR", "GBP"],
      default: "INR",
    },
  },
  { _id: false }
);

const proposalSchema = new Schema<IProposal>(
  {
    contactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    proposalNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    snapshot: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    items: {
      type: [proposalItemSchema],
      required: true,
      default: [],
    },
    totals: {
      subtotal: { type: Number, required: true, min: 0 },
      advance: { type: Number, required: true, min: 0 },
      balance: { type: Number, required: true, min: 0 },
      currency: {
        type: String,
        enum: ["INR", "USD", "EUR", "GBP"],
        default: "INR",
      },
    },
  },
  { timestamps: true }
);

proposalSchema.index({ contactId: 1, version: -1 });

const Proposal = mongoose.models.Proposal || model<IProposal>("Proposal", proposalSchema);

export default Proposal;

