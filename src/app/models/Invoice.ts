import mongoose, { Document, Schema, model } from "mongoose";

export type InvoiceCurrency = "INR" | "USD" | "EUR" | "GBP";
export type InvoiceStatus = "draft" | "sent" | "paid" | "partially_paid" | "cancelled";

export interface IInvoiceItem {
  serviceId?: mongoose.Types.ObjectId; // absent for ad-hoc/custom line items
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  amount: number; // quantity * unitPrice
  taxAmount: number; // amount * taxPercent / 100
  total: number; // amount + taxAmount
}

export interface IInvoiceDiscount {
  type: "flat" | "percent";
  value: number;
  amount: number; // resolved discount amount in the invoice currency
}

export interface IInvoiceContactSnapshot {
  name: string;
  email?: string;
  phone?: string;
  businessName?: string;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  contactId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  items: IInvoiceItem[];
  currency: InvoiceCurrency;
  subtotal: number;
  taxTotal: number;
  discount?: IInvoiceDiscount;
  total: number;
  amountPaid: number;
  balanceDue: number;
  paymentTerms?: string;
  notes?: string;
  contactSnapshot: IInvoiceContactSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, required: true, min: 0, max: 100, default: 0 },
    amount: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceDiscountSchema = new Schema<IInvoiceDiscount>(
  {
    type: { type: String, enum: ["flat", "percent"], required: true },
    value: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "partially_paid", "cancelled"],
      default: "draft",
      index: true,
    },
    issueDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    items: { type: [invoiceItemSchema], required: true, default: [] },
    currency: { type: String, enum: ["INR", "USD", "EUR", "GBP"], default: "INR" },
    subtotal: { type: Number, required: true, min: 0 },
    taxTotal: { type: Number, required: true, min: 0 },
    discount: invoiceDiscountSchema,
    total: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, required: true, min: 0, default: 0 },
    balanceDue: { type: Number, required: true, min: 0 },
    paymentTerms: { type: String, trim: true },
    notes: { type: String, trim: true },
    contactSnapshot: {
      name: { type: String, required: true },
      email: String,
      phone: String,
      businessName: String,
    },
  },
  { timestamps: true }
);

invoiceSchema.index({ createdAt: -1 });

const Invoice = mongoose.models.Invoice || model<IInvoice>("Invoice", invoiceSchema);

export default Invoice;
