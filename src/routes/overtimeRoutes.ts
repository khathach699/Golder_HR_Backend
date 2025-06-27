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
import {
  authenticateToken,
  check_authorization,
} from "../middlewares/authMiddleware";
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

// Debug route to test authorization
router.get("/admin/debug", authenticateToken, (req: any, res: any) => {
  console.log("🔍 [DEBUG] User object:", JSON.stringify(req.user, null, 2));
  res.json({
    success: true,
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      roleName: req.user.role?.name,
    },
  });
});

// Admin/HR routes
router.get(
  "/admin/all",
  authenticateToken,
  check_authorization(["admin", "hr", "manager"]),
  getAllOvertimeRequests
);
router.put(
  "/admin/:requestId/approve",
  authenticateToken,
  check_authorization(["admin", "hr", "manager"]),
  approveOvertimeRequest
);
router.put(
  "/admin/:requestId/reject",
  authenticateToken,
  check_authorization(["admin", "hr", "manager"]),
  rejectOvertimeRequest
);

export default router;
