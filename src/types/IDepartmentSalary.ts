// Tên tệp: IDepartmentSalary.ts

import { Schema, Document } from "mongoose";

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
