// File: src/routes/adminUserRoutes.ts

import { Router } from "express";
import { validate } from "../validators/validate";
import {
  CreateUserValidator,
  UpdateUserValidator,
  GetUsersListValidator,
  UserIdValidator,
  ResetUserPasswordValidator,
  BulkDeleteValidator,
  BulkRestoreValidator,
} from "../validators/adminUserValidator";
import * as AdminUserController from "../controllers/adminUserController";
import {
  authenticateToken,
  check_authorization,
} from "../middlewares/authMiddleware";

const router = Router();

router.use((req: any, res: any, next: any) => {
  next();
});

router.use((req: any, res: any, next: any) => {
  authenticateToken(req, res, (err: any) => {
    if (err) {
      return next(err);
    }
    next();
  });
});

router.use((req: any, res: any, next: any) => {
  check_authorization(["admin"])(req, res, (err: any) => {
    if (err) {
      return next(err);
    }
    next();
  });
});

router.get("/statistics", AdminUserController.getUserStatistics);

router.post(
  "/bulk-delete",
  BulkDeleteValidator,
  validate,
  AdminUserController.bulkDeleteUsers
);

router.post(
  "/bulk-restore",
  BulkRestoreValidator,
  validate,
  AdminUserController.bulkRestoreUsers
);

router.get(
  "/",
  GetUsersListValidator,
  validate,
  AdminUserController.getAllUsers
);

router.post("/", CreateUserValidator, validate, AdminUserController.createUser);

router.get(
  "/:userId",
  UserIdValidator,
  validate,
  AdminUserController.getUserById
);

router.put(
  "/:userId",
  UpdateUserValidator,
  validate,
  AdminUserController.updateUser
);

router.delete(
  "/:userId",
  UserIdValidator,
  validate,
  AdminUserController.softDeleteUser
);

router.patch(
  "/:userId/restore",
  UserIdValidator,
  validate,
  AdminUserController.restoreUser
);

router.patch(
  "/:userId/toggle-status",
  UserIdValidator,
  validate,
  AdminUserController.toggleUserStatus
);

router.patch(
  "/:userId/reset-password",
  ResetUserPasswordValidator,
  validate,
  AdminUserController.resetUserPassword
);

router.get("/debug/auth", (req: any, res: any) => {
  res.json({
    success: true,
    message: "Admin user routes authorization working",
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      roleName: req.user.role?.name,
    },
  });
});

export default router;