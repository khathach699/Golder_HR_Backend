"use strict";
// Tên tệp: departmentSalary.model.ts
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const departmentSalarySchema = new mongoose_1.Schema({
    employeeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    departmentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization", // Sử dụng Organization làm Department
        required: true,
    },
    hourlyRate: {
        type: Number,
        required: true,
        min: 0,
    },
    isDefault: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    effectiveFrom: {
        type: Date,
        required: true,
        default: Date.now,
    },
    effectiveTo: {
        type: Date,
        default: null,
    },
}, { timestamps: true });
// Index để tối ưu query
departmentSalarySchema.index({ employeeId: 1, departmentId: 1 });
departmentSalarySchema.index({ employeeId: 1, isActive: 1 });
// Đảm bảo mỗi nhân viên chỉ có 1 bộ phận mặc định
departmentSalarySchema.index({ employeeId: 1, isDefault: 1 });
exports.default = (0, mongoose_1.model)("DepartmentSalary", departmentSalarySchema);
