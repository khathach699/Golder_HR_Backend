import { Router } from "express";
import {
  createDepartmentSalary,
  getEmployeeSalaries,
  // getDailySalary, // TODO: Tạm thời comment
  deactivateSalary,
  getCurrentDepartmentSalary,
  getDepartmentsForDropdown,
  getEmployeesForDropdown,
} from "../controllers/departmentSalaryController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create or update department salary for employee
router.post("/", createDepartmentSalary);

// Get all department salaries for an employee
router.get("/employee/:employeeId", getEmployeeSalaries);

// TODO: Tạm thời comment để tập trung vào chấm công nhiều lần
// Get daily salary breakdown for an employee
// router.get("/daily/:employeeId/:workDate", getDailySalary);

// Get current department salary information
router.get("/current/:employeeId", getCurrentDepartmentSalary);

// Deactivate department salary for an employee
router.delete("/:employeeId/:departmentId", deactivateSalary);

// Get departments for dropdown
router.get("/departments-dropdown", getDepartmentsForDropdown);

// Get employees for dropdown
router.get("/employees-dropdown", getEmployeesForDropdown);

export default router;
