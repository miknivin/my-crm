import mongoose, { Schema, model, Document, Types } from "mongoose";

interface ILeaveRequest extends Document {
  employeeId: Types.ObjectId;
  employeeName: string;
  leaveType: "vacation" | "sick" | "personal" | "maternity" | "paternity" | "other";
  startDate: Date;
  endDate: Date;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approverId?: Types.ObjectId;
  comments?: string;
  durationType: "full-day" | "half-day" | "quarter-day";
  rejectedReason?: string
}

const leaveRequestSchema = new Schema<ILeaveRequest>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    leaveType: {
      type: String,
      enum: ["vacation", "sick", "personal", "maternity", "paternity", "other"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    comments: {
      type: String,
      trim: true,
    },
    
    durationType: {
      type: String,
      enum: ["full-day", "half-day", "quarter-day"],
      required: true,
      default: "full-day",
    },
    rejectedReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Validate that half-day and quarter-day leaves are for a single day
leaveRequestSchema.pre('validate', function (next) {
  if (this.durationType === 'half-day' || this.durationType === 'quarter-day') {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    // Set time to midnight for comparison
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (start.getTime() !== end.getTime()) {
      next(new Error('Half-day and quarter-day leaves must be on the same day'));
    }
  }
  next();
});

const LeaveRequest = 
  mongoose.models.LeaveRequest || model<ILeaveRequest>("LeaveRequest", leaveRequestSchema);

export default LeaveRequest;