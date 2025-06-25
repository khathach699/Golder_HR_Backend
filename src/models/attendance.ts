import { Schema, model } from "mongoose";
import { AttendanceDocument } from "../types/attendance";

const locationSchema = new Schema(
  {
    coordinates: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    address: { type: String, required: true },
  },
  { _id: false }
);

const attendanceEntrySchema = new Schema(
  {
    time: { type: Date, required: true },
    imageUrl: { type: String, required: true },
    location: { type: locationSchema, required: true },
  },
  { _id: false }
);

const attendanceSchema = new Schema<AttendanceDocument>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    workDate: { type: String, required: true, index: true },
    checkIn: { type: attendanceEntrySchema },
    checkOut: { type: attendanceEntrySchema },
    status: {
      type: String,
      enum: ["PRESENT", "ON_LEAVE"],
      default: "PRESENT",
    },
    totalHours: { type: String, default: "--" },
    overtime: { type: String, default: "--" },
  },
  { timestamps: true }
);

attendanceSchema.index({ employeeId: 1, workDate: 1 }, { unique: true });

export default model<AttendanceDocument>("Attendance", attendanceSchema);
