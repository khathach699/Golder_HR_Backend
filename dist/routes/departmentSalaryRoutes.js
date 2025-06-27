"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const departmentSalaryController_1 = require("../controllers/departmentSalaryController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use(authMiddleware_1.authenticateToken);
// Create or update department salary for employee
router.post("/", departmentSalaryController_1.createDepartmentSalary);
// Get all department salaries for an employee
router.get("/employee/:employeeId", departmentSalaryController_1.getEmployeeSalaries);
// TODO: Tạm thời comment để tập trung vào chấm công nhiều lần
// Get daily salary breakdown for an employee
// router.get("/daily/:employeeId/:workDate", getDailySalary);
// Get current department salary information
router.get("/current/:employeeId", departmentSalaryController_1.getCurrentDepartmentSalary);
// Deactivate department salary for an employee
router.delete("/:employeeId/:departmentId", departmentSalaryController_1.deactivateSalary);
// Get departments for dropdown
router.get("/departments-dropdown", departmentSalaryController_1.getDepartmentsForDropdown);
// Get employees for dropdown
router.get("/employees-dropdown", departmentSalaryController_1.getEmployeesForDropdown);
exports.default = router;
