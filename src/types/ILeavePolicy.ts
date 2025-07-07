// Filename: ILeavePolicy.ts

import { Document } from "mongoose";

export interface ILeavePolicy extends Document {
  leaveType: "annual" | "sick" | "personal" | "maternity" | "unpaid";
  maxDaysPerYear: number;
  maxDaysPerRequest: number;
  advanceNoticeDays: number;
  carryOverDays?: number; // Days that can be carried over to next year
  isActive: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
