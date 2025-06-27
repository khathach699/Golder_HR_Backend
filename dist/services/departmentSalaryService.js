"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivateDepartmentSalary = exports.getEmployeeDepartmentSalaries = exports.createOrUpdateDepartmentSalary = exports.getDepartmentSalaryInfo = void 0;
const departmentSalary_1 = __importDefault(require("../models/departmentSalary"));
const user_1 = __importDefault(require("../models/user"));
// Lấy thông tin bộ phận và mức lương cho nhân viên
const getDepartmentSalaryInfo = async (employeeId, departmentId) => {
    let salaryInfo = null;
    if (departmentId) {
        // Nếu có departmentId cụ thể, tìm theo đó
        salaryInfo = await departmentSalary_1.default.findOne({
            employeeId,
            departmentId,
            isActive: true,
            $or: [{ effectiveTo: null }, { effectiveTo: { $gte: new Date() } }],
        });
    }
    if (!salaryInfo) {
        // Nếu không tìm thấy hoặc không có departmentId, lấy bộ phận mặc định
        salaryInfo = await departmentSalary_1.default.findOne({
            employeeId,
            isDefault: true,
            isActive: true,
            $or: [{ effectiveTo: null }, { effectiveTo: { $gte: new Date() } }],
        });
    }
    if (!salaryInfo) {
        // Nếu vẫn không có, lấy từ organization của user
        const user = await user_1.default.findById(employeeId);
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
exports.getDepartmentSalaryInfo = getDepartmentSalaryInfo;
// Tạo hoặc cập nhật mức lương cho nhân viên theo bộ phận
const createOrUpdateDepartmentSalary = async (employeeId, departmentId, hourlyRate, isDefault = false) => {
    // Nếu đặt làm default, cần bỏ default của các bộ phận khác
    if (isDefault) {
        await departmentSalary_1.default.updateMany({ employeeId, isDefault: true }, { isDefault: false });
    }
    const existingSalary = await departmentSalary_1.default.findOne({
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
    }
    else {
        // Tạo mới
        const newSalary = new departmentSalary_1.default({
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
exports.createOrUpdateDepartmentSalary = createOrUpdateDepartmentSalary;
// Lấy tất cả mức lương của nhân viên theo các bộ phận
const getEmployeeDepartmentSalaries = async (employeeId) => {
    return await departmentSalary_1.default.find({
        employeeId,
        isActive: true,
    })
        .populate("departmentId", "name")
        .sort({ isDefault: -1, createdAt: -1 });
};
exports.getEmployeeDepartmentSalaries = getEmployeeDepartmentSalaries;
// Vô hiệu hóa mức lương cho một bộ phận
const deactivateDepartmentSalary = async (employeeId, departmentId) => {
    await departmentSalary_1.default.updateOne({ employeeId, departmentId }, {
        isActive: false,
        effectiveTo: new Date(),
    });
};
exports.deactivateDepartmentSalary = deactivateDepartmentSalary;
