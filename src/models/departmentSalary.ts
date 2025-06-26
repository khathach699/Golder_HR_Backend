import { Schema, model, Document } from "mongoose";

// Interface cho Department Salary
export interface IDepartmentSalary extends Document {
  employeeId: Schema.Types.ObjectId;
  departmentId: Schema.Types.ObjectId;
  hourlyRate: number; // Mức lương theo giờ
  isDefault: boolean; // Bộ phận mặc định của nhân viên
  isActive: boolean; // Có đang hoạt động không
  effectiveFrom: Date; // Có hiệu lực từ ngày
  effectiveTo?: Date; // Có hiệu lực đến ngày (optional)
  createdAt?: Date;
  updatedAt?: Date;
}

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
departmentSalarySchema.index({ employeeId: 1, isDefault: 1 });
departmentSalarySchema.index({ employeeId: 1, isActive: 1 });

// Đảm bảo mỗi nhân viên chỉ có 1 bộ phận mặc định
departmentSalarySchema.index(
  { employeeId: 1, isDefault: 1 },
  { 
    unique: true, 
    partialFilterExpression: { isDefault: true } 
  }
);

export default model<IDepartmentSalary>("DepartmentSalary", departmentSalarySchema);
