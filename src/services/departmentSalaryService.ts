import { IDepartmentSalary } from "./../types/IDepartmentSalary";
import DepartmentSalary from "../models/departmentSalary";

import User from "../models/user";

// Lấy thông tin bộ phận và mức lương cho nhân viên
export const getDepartmentSalaryInfo = async (
  employeeId: string,
  departmentId?: string
): Promise<{
  departmentId: string;
  hourlyRate: number;
}> => {
  let salaryInfo: IDepartmentSalary | null = null;

  if (departmentId) {
    // Nếu có departmentId cụ thể, tìm theo đó
    salaryInfo = await DepartmentSalary.findOne({
      employeeId,
      departmentId,
      isActive: true,
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: new Date() } }],
    });
  }

  if (!salaryInfo) {
    // Nếu không tìm thấy hoặc không có departmentId, lấy bộ phận mặc định
    salaryInfo = await DepartmentSalary.findOne({
      employeeId,
      isDefault: true,
      isActive: true,
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: new Date() } }],
    });
  }

  if (!salaryInfo) {
    // Nếu vẫn không có, lấy từ organization của user
    const user = await User.findById(employeeId);
    if (!user || !user.organization) {
      throw new Error("Không tìm thấy thông tin bộ phận cho nhân viên");
    }

    // Tạo mức lương mặc định (có thể cấu hình)
    const defaultHourlyRate = 50000; // 50k VND/giờ mặc định

    return {
      departmentId: user.organization.toString(),
      hourlyRate: defaultHourlyRate,
    };
  }

  return {
    departmentId: salaryInfo.departmentId.toString(),
    hourlyRate: salaryInfo.hourlyRate,
  };
};

// Tạo hoặc cập nhật mức lương cho nhân viên theo bộ phận
export const createOrUpdateDepartmentSalary = async (
  employeeId: string,
  departmentId: string,
  hourlyRate: number,
  isDefault: boolean = false
): Promise<IDepartmentSalary> => {
  // Nếu đặt làm default, cần bỏ default của các bộ phận khác
  if (isDefault) {
    await DepartmentSalary.updateMany(
      { employeeId, isDefault: true },
      { isDefault: false }
    );
  }

  const existingSalary = await DepartmentSalary.findOne({
    employeeId,
    departmentId,
  });

  if (existingSalary) {
    // Cập nhật existing
    existingSalary.hourlyRate = hourlyRate;
    existingSalary.isDefault = isDefault;
    existingSalary.isActive = true;
    existingSalary.effectiveFrom = new Date();
    existingSalary.effectiveTo = undefined;

    return await existingSalary.save();
  } else {
    // Tạo mới
    const newSalary = new DepartmentSalary({
      employeeId,
      departmentId,
      hourlyRate,
      isDefault,
      isActive: true,
      effectiveFrom: new Date(),
    });

    return await newSalary.save();
  }
};

// Lấy tất cả mức lương của nhân viên theo các bộ phận
export const getEmployeeDepartmentSalaries = async (
  employeeId: string
): Promise<IDepartmentSalary[]> => {
  return await DepartmentSalary.find({
    employeeId,
    isActive: true,
  })
    .populate("departmentId", "name")
    .sort({ isDefault: -1, createdAt: -1 });
};

// Vô hiệu hóa mức lương cho một bộ phận
export const deactivateDepartmentSalary = async (
  employeeId: string,
  departmentId: string
): Promise<void> => {
  await DepartmentSalary.updateOne(
    { employeeId, departmentId },
    {
      isActive: false,
      effectiveTo: new Date(),
    }
  );
};
