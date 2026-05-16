import mongoose, { Document, Schema, model } from 'mongoose';

export interface IService extends Document {
  name: string;
  description?: string;
  category?: string;
  price: number;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  billingType: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
  taxPercent?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP'],
      default: 'INR',
    },
    billingType: {
      type: String,
      enum: ['one-time', 'monthly', 'quarterly', 'yearly'],
      default: 'one-time',
    },
    taxPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Service = mongoose.models.Service || model<IService>('Service', serviceSchema);

export default Service;

