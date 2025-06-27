import { Router } from "express";
import {
  getOvertimeSummary,
  getOvertimeHistory,
  submitOvertimeRequest,
  updateOvertimeRequest,
  cancelOvertimeRequest,
  getOvertimeRequestById,
  getApprovers,
  approveOvertimeRequest,
  rejectOvertimeRequest,
  getAllOvertimeRequests,
} from "../controllers/overtimeController";
import { authenticateToken } from "../middlewares/authMiddleware";
import { validateOvertimeRequest } from "../validators/overtimeValidator";

const router = Router();

// Employee routes
router.get("/summary", authenticateToken, getOvertimeSummary);
router.get("/history", authenticateToken, getOvertimeHistory);
router.get("/approvers", authenticateToken, getApprovers);
router.post(
  "/submit",
  authenticateToken,
  validateOvertimeRequest,
  submitOvertimeRequest
);
router.put(
  "/:requestId",
  authenticateToken,
  validateOvertimeRequest,
  updateOvertimeRequest
);
router.delete("/:requestId", authenticateToken, cancelOvertimeRequest);
router.get("/:requestId", authenticateToken, getOvertimeRequestById);

// Admin/HR routes
router.get("/admin/all", authenticateToken, getAllOvertimeRequests);
router.put(
  "/admin/:requestId/approve",
  authenticateToken,
  approveOvertimeRequest
);
router.put(
  "/admin/:requestId/reject",
  authenticateToken,
  rejectOvertimeRequest
);

export default router;
