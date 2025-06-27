"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmployeesForDropdown = exports.getDepartmentsForDropdown = exports.getCurrentDepartmentSalary = exports.deactivateSalary = exports.getEmployeeSalaries = exports.createDepartmentSalary = void 0;
const departmentSalaryService_1 = require("../services/departmentSalaryService");
// TODO: Tạm thời comment để tập trung vào chấm công nhiều lần
// import { getDailySalaryBreakdown } from "../services/attendanceService";
const responseHandler_1 = require("../utils/responseHandler");
const user_1 = __importDefault(require("../models/user"));
const organization_1 = __importDefault(require("../models/organization"));
/**
 * @swagger
 * /api/department-salary:
 *   post:
 *     summary: Create or update department salary for employee
 *     tags: [Department Salary]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - departmentId
 *               - hourlyRate
 *             properties:
 *               employeeId:
 *                 type: string
 *                 description: Employee ID
 *               departmentId:
 *                 type: string
 *                 description: Department ID
 *               hourlyRate:
 *                 type: number
 *                 description: Hourly rate in VND
 *                 example: 50000
 *               isDefault:
 *                 type: boolean
 *                 description: Set as default department
 *                 default: false
 *     responses:
 *       201:
 *         description: Department salary created/updated successfully
 *       400:
 *         description: Bad request - missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
const createDepartmentSalary = async (req, res) => {
    try {
        const { employeeId, departmentId, hourlyRate, isDefault } = req.body;
        if (!employeeId || !departmentId || !hourlyRate) {
            return (0, responseHandler_1.CreateErrorResponse)(res, 400, "Thiếu thông tin bắt buộc: employeeId, departmentId, hourlyRate");
        }
        if (typeof hourlyRate !== "number" || hourlyRate <= 0) {
            return (0, responseHandler_1.CreateErrorResponse)(res, 400, "Mức lương theo giờ phải là số dương");
        }
        const salary = await (0, departmentSalaryService_1.createOrUpdateDepartmentSalary)(employeeId, departmentId, hourlyRate, isDefault || false);
        return (0, responseHandler_1.CreateSuccessResponse)(res, 201, {
            salary,
            message: "Tạo/cập nhật mức lương thành công",
        });
    }
    catch (error) {
        return (0, responseHandler_1.CreateErrorResponse)(res, 500, error.message || "An internal server error occurred");
    }
};
exports.createDepartmentSalary = createDepartmentSalary;
/**
 * @swagger
 * /api/department-salary/employee/{employeeId}:
 *   get:
 *     summary: Get all department salaries for an employee
 *     tags: [Department Salary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee salaries retrieved successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
const getEmployeeSalaries = async (req, res) => {
    try {
        const { employeeId } = req.params;
        if (!employeeId) {
            return (0, responseHandler_1.CreateErrorResponse)(res, 400, "Employee ID is required");
        }
        const salaries = await (0, departmentSalaryService_1.getEmployeeDepartmentSalaries)(employeeId);
        return (0, responseHandler_1.CreateSuccessResponse)(res, 200, { salaries });
    }
    catch (error) {
        return (0, responseHandler_1.CreateErrorResponse)(res, 500, error.message || "An internal server error occurred");
    }
};
exports.getEmployeeSalaries = getEmployeeSalaries;
/**
 * @swagger
 * /api/department-salary/daily/{employeeId}/{workDate}:
 *   get:
 *     summary: Get daily salary breakdown for an employee
 *     tags: [Department Salary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *       - in: path
 *         name: workDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Work date (YYYY-MM-DD)
 *         example: "2024-01-15"
 *     responses:
 *       200:
 *         description: Daily salary breakdown retrieved successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
// TODO: Tạm thời comment để tập trung vào chấm công nhiều lần
/* export const getDailySalary = async (req: Request, res: Response) => {
  try {
    const { employeeId, workDate } = req.params;

    if (!employeeId || !workDate) {
      return CreateErrorResponse(
        res,
        400,
        "Employee ID and work date are required"
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(workDate)) {
      return CreateErrorResponse(
        res,
        400,
        "Invalid date format. Use YYYY-MM-DD"
      );
    }

    const salaryBreakdown = await getDailySalaryBreakdown(employeeId, workDate);

    return CreateSuccessResponse(res, 200, { salaryBreakdown });
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "An internal server error occurred"
    );
  }
}; */
/**
 * @swagger
 * /api/department-salary/{employeeId}/{departmentId}:
 *   delete:
 *     summary: Deactivate department salary for an employee
 *     tags: [Department Salary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department salary deactivated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
const deactivateSalary = async (req, res) => {
    try {
        const { employeeId, departmentId } = req.params;
        if (!employeeId || !departmentId) {
            return (0, responseHandler_1.CreateErrorResponse)(res, 400, "Employee ID and Department ID are required");
        }
        await (0, departmentSalaryService_1.deactivateDepartmentSalary)(employeeId, departmentId);
        return (0, responseHandler_1.CreateSuccessResponse)(res, 200, {
            message: "Vô hiệu hóa mức lương thành công",
        });
    }
    catch (error) {
        return (0, responseHandler_1.CreateErrorResponse)(res, 500, error.message || "An internal server error occurred");
    }
};
exports.deactivateSalary = deactivateSalary;
/**
 * @swagger
 * /api/department-salary/current/{employeeId}:
 *   get:
 *     summary: Get current department salary information for an employee
 *     tags: [Department Salary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *       - in: query
 *         name: departmentId
 *         required: false
 *         schema:
 *           type: string
 *         description: Department ID (optional)
 *     responses:
 *       200:
 *         description: Current department salary information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     employeeId:
 *                       type: string
 *                     departmentId:
 *                       type: string
 *                     departmentName:
 *                       type: string
 *                     hourlyRate:
 *                       type: number
 *                     isDefault:
 *                       type: boolean
 *       400:
 *         description: Bad request - missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
const getCurrentDepartmentSalary = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { departmentId } = req.query;
        if (!employeeId) {
            return (0, responseHandler_1.CreateErrorResponse)(res, 400, "Employee ID is required");
        }
        const salaryInfo = await (0, departmentSalaryService_1.getDepartmentSalaryInfo)(employeeId, departmentId);
        return (0, responseHandler_1.CreateSuccessResponse)(res, 200, { salaryInfo });
    }
    catch (error) {
        return (0, responseHandler_1.CreateErrorResponse)(res, 500, error.message || "An internal server error occurred");
    }
};
exports.getCurrentDepartmentSalary = getCurrentDepartmentSalary;
/**
 * @swagger
 * /api/department-salary/departments-dropdown:
 *   get:
 *     summary: Get list of active departments for dropdown
 *     tags: [Department Salary]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of departments returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "60c72b2f9b1e8b001c8f1234"
 *                       name:
 *                         type: string
 *                         example: "IT Department"
 *                       description:
 *                         type: string
 *                         example: "Information Technology Department"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
const getDepartmentsForDropdown = async (_req, res) => {
    try {
        const departments = await organization_1.default.find({
            isdeleted: false,
            isdisable: false,
            isActive: true,
        })
            .select("name description")
            .lean();
        return (0, responseHandler_1.CreateSuccessResponse)(res, 200, departments.map((dept) => ({
            id: dept._id.toString(),
            name: dept.name,
            description: dept.description,
        })));
    }
    catch (error) {
        return (0, responseHandler_1.CreateErrorResponse)(res, 500, error.message || "An internal server error occurred");
    }
};
exports.getDepartmentsForDropdown = getDepartmentsForDropdown;
/**
 * @swagger
 * /api/department-salary/employees-dropdown:
 *   get:
 *     summary: Get list of active employees for dropdown
 *     tags: [Department Salary]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "60c72b2f9b1e8b001c8f1234"
 *                       fullname:
 *                         type: string
 *                         example: "Nguyễn Văn A"
 *                       email:
 *                         type: string
 *                         example: "vana@example.com"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
const getEmployeesForDropdown = async (_req, res) => {
    try {
        const employees = await user_1.default.find({
            isdeleted: false,
            isdisable: false,
        })
            .select("fullname email")
            .lean();
        return (0, responseHandler_1.CreateSuccessResponse)(res, 200, employees.map((emp) => ({
            id: emp._id.toString(),
            fullname: emp.fullname,
            email: emp.email,
        })));
    }
    catch (error) {
        return (0, responseHandler_1.CreateErrorResponse)(res, 500, error.message || "An internal server error occurred");
    }
};
exports.getEmployeesForDropdown = getEmployeesForDropdown;
