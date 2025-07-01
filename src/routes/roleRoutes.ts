import { Router } from "express";
import { validate } from "../validators/validate";
import {
  authenticateToken,
  check_authorization,
} from "../middlewares/authMiddleware";
import * as RoleController from "../controllers/roleController";

const router = Router();

router.use(authenticateToken);
router.use(check_authorization(["admin"]));

router.get("/", RoleController.getAllRoles);
router.get("/dropdown", RoleController.getRolesForDropdown);
router.get("/check-name", RoleController.checkRoleName);
router.post("/", RoleController.createRole);
router.get("/:roleId", RoleController.getRoleById);
router.put("/:roleId", RoleController.updateRole);
router.delete("/:roleId", RoleController.deleteRole);

export default router;
