// Filename: leaveRequest.model.ts

import mongoose, { Schema } from "mongoose";
import { ILeaveRequest } from "../types/ILeaveRequest";

const LeaveRequestSchema: Schema = new Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["annual", "sick", "personal", "maternity", "unpaid"],
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
    duration: {
      type: Number,
      min: 1,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    assignedApproverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
LeaveRequestSchema.index({ employeeId: 1, createdAt: -1 });
LeaveRequestSchema.index({ status: 1, createdAt: -1 });
LeaveRequestSchema.index({ startDate: 1, endDate: 1 });
LeaveRequestSchema.index({ type: 1 });

// Virtual for calculating duration automatically
LeaveRequestSchema.pre("save", function (next) {
  if (this.startDate && this.endDate) {
    const startDate = new Date(this.startDate as any);
    const endDate = new Date(this.endDate as any);

    // Calculate the difference in days
    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates

    this.duration = daysDiff;
  }
  next();
});

export default mongoose.model<ILeaveRequest>(
  "LeaveRequest",
  LeaveRequestSchema
);
