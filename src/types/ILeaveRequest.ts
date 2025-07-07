// Filename: ILeaveRequest.ts

import mongoose, { Document } from "mongoose";

export interface ILeaveRequest extends Document {
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  type: "annual" | "sick" | "personal" | "maternity" | "unpaid";
  startDate: Date;
  endDate: Date;
  duration: number; // in days
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  assignedApproverId?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
