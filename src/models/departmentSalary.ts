// Tên tệp: departmentSalary.model.ts

import { Schema, model } from "mongoose";
import { IDepartmentSalary } from "../types/IDepartmentSalary";

const departmentSalarySchema = new Schema<IDepartmentSalary>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
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
  },
  { timestamps: true }
);

// Index để tối ưu query
departmentSalarySchema.index({ employeeId: 1, departmentId: 1 });
departmentSalarySchema.index({ employeeId: 1, isActive: 1 });

// Đảm bảo mỗi nhân viên chỉ có 1 bộ phận mặc định
departmentSalarySchema.index({ employeeId: 1, isDefault: 1 });

export default model<IDepartmentSalary>(
  "DepartmentSalary",
  departmentSalarySchema
);
