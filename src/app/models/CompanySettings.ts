import mongoose, { Schema, model } from "mongoose";

// Singleton document (fixed _id) — findOneAndUpdate({_id: SETTINGS_ID}, {$set}, {upsert:true})
// is always safe/idempotent, so there's never more than one company profile.
export const COMPANY_SETTINGS_ID = "company-settings";

export interface IBankDetails {
  accountName?: string;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  upiId?: string;
}

export interface ICompanySettings {
  _id: string;
  companyName: string;
  logo?: { public_id: string; url: string };
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  taxId?: string;
  bankDetails?: IBankDetails;
  invoicePrefix: string;
  invoiceNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bankDetailsSchema = new Schema<IBankDetails>(
  {
    accountName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifsc: { type: String, trim: true },
    bankName: { type: String, trim: true },
    upiId: { type: String, trim: true },
  },
  { _id: false }
);

const companySettingsSchema = new Schema<ICompanySettings>(
  {
    _id: { type: String, default: COMPANY_SETTINGS_ID },
    companyName: { type: String, required: true, trim: true, default: "" },
    logo: {
      public_id: String,
      url: String,
    },
    address: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    taxId: { type: String, trim: true },
    bankDetails: bankDetailsSchema,
    invoicePrefix: { type: String, trim: true, default: "INV" },
    invoiceNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

const CompanySettings =
  mongoose.models.CompanySettings || model<ICompanySettings>("CompanySettings", companySettingsSchema);

export default CompanySettings;
