import * as attendanceController from "../controllers/attendanceController";
import { Router } from "express";
import { check_authentication } from "../middlewares/authMiddleware";
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
export default router;
