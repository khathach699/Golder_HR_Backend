// Filename: IOvertimeRequest.ts

import type { Document, Types } from "mongoose";

export interface IOvertimeRequest extends Document {
  employeeId: Types.ObjectId;
  employeeName: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  hours: number;
  reason: string;
  type: "regular" | "weekend" | "holiday";
  status: "pending" | "approved" | "rejected";
  assignedApproverId?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  // createdAt & updatedAt are automatically added by timestamps option
}
