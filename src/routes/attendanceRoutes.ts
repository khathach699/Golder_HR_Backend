import { getMonthSummary } from "./../services/attendanceService";
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

router.get(
  "/check-status",
  check_authentication,
  attendanceController.checkAttendanceStatus
);

router.get(
  "/today-summary",
  check_authentication,
  attendanceController.getTodaySummary
);
router.get(
  "/summary/week",
  check_authentication,
  attendanceController.getWeekSummary
);

router.get(
  "/summary/month",
  check_authentication,
  attendanceController.getMonthSummary
);

router.get(
  "/monthly-details",
  check_authentication,
  attendanceController.getMonthlyDetails
);
router.get("/history", check_authentication, attendanceController.getHistory);
export default router;
