"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const locationSchema = new mongoose_1.Schema({
    coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], required: true },
    },
    address: { type: String, required: true },
}, { _id: false });
const attendanceEntrySchema = new mongoose_1.Schema({
    time: { type: Date, required: true },
    imageUrl: { type: String, required: true },
    location: { type: locationSchema, required: true },
    // TODO: Tạm thời làm optional để tập trung vào chấm công nhiều lần
    departmentId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, { _id: false });
const attendanceSchema = new mongoose_1.Schema({
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
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
}, { timestamps: true });
attendanceSchema.index({ employeeId: 1, workDate: 1 }, { unique: true });
exports.default = (0, mongoose_1.model)("Attendance", attendanceSchema);
