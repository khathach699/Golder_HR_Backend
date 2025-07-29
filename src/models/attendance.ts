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
    imageUrl: { type: String, required: false }, // Make optional for manual attendance
    location: { type: locationSchema, required: false }, // Make optional for manual attendance
    // TODO: Tạm thời làm optional để tập trung vào chấm công nhiều lần
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: false, // Tạm thời không bắt buộc
      default: null,
    },
    hourlyRate: {
      type: Number,
      required: false, // Tạm thời không bắt buộc
      min: 0,
      default: 0,
    },
    // Manual attendance fields
    isManual: { type: Boolean, default: false },
    manualAttendanceId: {
      type: Schema.Types.ObjectId,
      ref: "ManualAttendance",
      required: false
    },
    // Device information for tracking
    deviceInfo: {
      deviceId: { type: String }, // Unique device identifier
      platform: { type: String }, // iOS, Android, etc.
      model: { type: String },
      brand: { type: String },
      version: { type: String },
      appVersion: { type: String },
    },
  },
  { _id: false }
);

const attendanceSchema = new Schema<AttendanceDocument>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    workDate: { type: String, required: true },

    checkIns: [{ type: attendanceEntrySchema }],
    checkOuts: [{ type: attendanceEntrySchema }],
    // Backward compatibility fields - optional
    checkIn: {
      type: attendanceEntrySchema,
      required: false,
      default: undefined,
    },
    checkOut: {
      type: attendanceEntrySchema,
      required: false,
      default: undefined,
    },
    status: {
      type: String,
      enum: ["PRESENT", "ON_LEAVE"],
      default: "PRESENT",
    },
    totalHours: { type: String, default: "--" },
    overtime: { type: String, default: "--" },
    IdMapper: { type: Number, default: null },
    CodeMapper: { type: String, maxlength: 50, default: null },
  },
  { timestamps: true }
);

attendanceSchema.index({ employeeId: 1, workDate: 1 }, { unique: true });

export default model<AttendanceDocument>("Attendance", attendanceSchema);
