// Filename: overtimeRequest.model.ts

import { Schema, model } from "mongoose";
import { IOvertimeRequest } from "../types/IOvertimeRequest"; // Import the interface

const OvertimeRequestSchema = new Schema<IOvertimeRequest>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    hours: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["regular", "weekend", "holiday"],
      default: "regular",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    assignedApproverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
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
    // Mongoose adds createdAt and updatedAt automatically
    timestamps: true,
  }
);

// Indexes for better query performance
OvertimeRequestSchema.index({ employeeId: 1, createdAt: -1 });
OvertimeRequestSchema.index({ status: 1, createdAt: -1 });
OvertimeRequestSchema.index({ date: 1 });

// Mongoose middleware to calculate hours before saving
OvertimeRequestSchema.pre<IOvertimeRequest>("save", function (next) {
  // `this` refers to the document being saved
  if (this.isModified("startTime") || this.isModified("endTime")) {
    const diffMs = this.endTime.getTime() - this.startTime.getTime();
    this.hours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)); // Convert ms to hours, rounded to 2 decimal places
  }
  next();
});

const OvertimeRequest = model<IOvertimeRequest>(
  "OvertimeRequest",
  OvertimeRequestSchema
);

export default OvertimeRequest;
