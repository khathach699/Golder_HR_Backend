import { getMonthSummary } from "./../services/attendanceService";
import * as attendanceController from "../controllers/attendanceController";
import { Router } from "express";
import {
  authenticateToken,
  check_authorization,
} from "../middlewares/authMiddleware";
import multer from "multer";
import manualAttendanceRoutes from "./manualAttendanceRoutes";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();
router.post(
  "/check-in",
  upload.single("image"),
  authenticateToken,
  attendanceController.checkIn
);
router.post(
  "/check-out",
  upload.single("image"),
  authenticateToken,
  attendanceController.checkOut
);

router.get(
  "/users-dropdown",
  authenticateToken,
  check_authorization(["admin"]),
  attendanceController.getUsersForDropdown
);

// Route upload ảnh khuôn mặt (chỉ admin)
router.post(
  "/upload-face/:userId",
  authenticateToken,
  check_authorization(["admin"]),
  upload.single("image"),
  attendanceController.uploadEmployeeFace
);

router.get(
  "/check-status",
  authenticateToken,
  attendanceController.checkAttendanceStatus
);

router.get(
  "/today-summary",
  authenticateToken,
  attendanceController.getTodaySummary
);
router.get(
  "/summary/week",
  authenticateToken,
  attendanceController.getWeekSummary
);

router.get(
  "/summary/month",
  authenticateToken,
  attendanceController.getMonthSummary
);

router.get(
  "/monthly-details",
  authenticateToken,
  attendanceController.getMonthlyDetails
);

router.get(
  "/daily-details",
  authenticateToken,
  attendanceController.getDailyAttendanceDetails
);

router.get("/history", authenticateToken, attendanceController.getHistory);

// Manual attendance routes
router.use("/manual-attendance", manualAttendanceRoutes);

export default router;
