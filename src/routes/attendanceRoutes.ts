import * as attendanceController from "../controllers/attendanceController";
import { Router } from "express";
import {
  check_authentication,
  check_authorization,
} from "../middlewares/authMiddleware";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();
router.post(
  "/check-in",
  upload.single("image"),
  check_authentication,
  attendanceController.checkIn
);
router.post(
  "/check-out",
  upload.single("image"),
  check_authentication,
  attendanceController.checkOut
);

router.get(
  "/users-dropdown",
  check_authentication,
  check_authorization(["admin"]),
  attendanceController.getUsersForDropdown
);

// Route upload ảnh khuôn mặt (chỉ admin)
router.post(
  "/upload-face/:userId",
  check_authentication,
  check_authorization(["admin"]),
  upload.single("image"),
  attendanceController.uploadEmployeeFace
);
export default router;
