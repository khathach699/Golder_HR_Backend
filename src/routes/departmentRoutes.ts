import { Router } from "express";
import { validate } from "../validators/validate";
import {
  authenticateToken,
  check_authorization,
} from "../middlewares/authMiddleware";
import * as DepartmentController from "../controllers/departmentController";

const router = Router();

router.use(authenticateToken);
router.use(check_authorization(["admin"]));

router.get("/", DepartmentController.getAllDepartments);
router.get("/dropdown", DepartmentController.getDepartmentsForDropdown);
router.get("/check-name", DepartmentController.checkDepartmentName);
router.get("/check-code", DepartmentController.checkDepartmentCode);
router.get("/hierarchy", DepartmentController.getDepartmentHierarchy);
router.post("/", DepartmentController.createDepartment);
router.get("/:departmentId", DepartmentController.getDepartmentById);
router.put("/:departmentId", DepartmentController.updateDepartment);
router.delete("/:departmentId", DepartmentController.deleteDepartment);
router.patch("/:departmentId/restore", DepartmentController.restoreDepartment);
router.patch(
  "/:departmentId/toggle-status",
  DepartmentController.toggleDepartmentStatus
);

export default router;
