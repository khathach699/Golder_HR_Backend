// Filename: leavePolicy.model.ts

import mongoose, { Schema } from "mongoose";
import { ILeavePolicy } from "../types/ILeavePolicy";

const LeavePolicySchema: Schema = new Schema(
  {
    leaveType: {
      type: String,
      enum: ["annual", "sick", "personal", "maternity", "unpaid"],
      required: true,
      unique: true,
    },
    maxDaysPerYear: {
      type: Number,
      required: true,
      min: 0,
    },
    maxDaysPerRequest: {
      type: Number,
      required: true,
      min: 1,
    },
    advanceNoticeDays: {
      type: Number,
      required: true,
      min: 0,
    },
    carryOverDays: {
      type: Number,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
LeavePolicySchema.index({ leaveType: 1, isActive: 1 });

const LeavePolicy = mongoose.model<ILeavePolicy>(
  "LeavePolicy",
  LeavePolicySchema
);

export default LeavePolicy;

// Default leave policies for HRM system
export const DEFAULT_LEAVE_POLICIES = [
  {
    leaveType: "annual",
    maxDaysPerYear: 12,
    maxDaysPerRequest: 30,
    advanceNoticeDays: 1,
    carryOverDays: 5,
    description:
      "Annual vacation leave - paid time off for rest and recreation",
  },
  {
    leaveType: "sick",
    maxDaysPerYear: 15,
    maxDaysPerRequest: 30,
    advanceNoticeDays: 0,
    carryOverDays: 0,
    description: "Medical leave for illness or medical appointments",
  },
  {
    leaveType: "personal",
    maxDaysPerYear: 5,
    maxDaysPerRequest: 10,
    advanceNoticeDays: 2,
    carryOverDays: 0,
    description: "Personal leave for family matters or emergencies",
  },
  {
    leaveType: "maternity",
    maxDaysPerYear: 180,
    maxDaysPerRequest: 180,
    advanceNoticeDays: 7,
    carryOverDays: 0,
    description: "Maternity leave for childbirth and childcare",
  },
  {
    leaveType: "unpaid",
    maxDaysPerYear: 30,
    maxDaysPerRequest: 30,
    advanceNoticeDays: 2,
    carryOverDays: 0,
    description: "Unpaid leave for extended personal time off",
  },
];
