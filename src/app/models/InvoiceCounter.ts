import mongoose, { Schema, model } from "mongoose";

// Tiny atomic sequence counter so invoice numbers are race-condition-safe
// (unlike Proposal's date+version scheme, which can collide under
// concurrent creation for the same contact).
export interface IInvoiceCounter {
  _id: string;
  seq: number;
}

const invoiceCounterSchema = new Schema<IInvoiceCounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const InvoiceCounter =
  mongoose.models.InvoiceCounter || model<IInvoiceCounter>("InvoiceCounter", invoiceCounterSchema);

export async function getNextInvoiceSequence(): Promise<number> {
  const counter = await InvoiceCounter.findByIdAndUpdate(
    "invoice",
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

export default InvoiceCounter;
