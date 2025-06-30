import { Router } from "express";
import {
  getLeaveSummary,
  getLeaveHistory,
  submitLeaveRequest,
  updateLeaveRequest,
  cancelLeaveRequest,
  getLeaveRequestById,
  getApprovers,
  approveLeaveRequest,
  rejectLeaveRequest,
  getAllLeaveRequests,
  initializeLeavePolicies,
  getLeavePolicies,
} from "../controllers/leaveController";
import {
  authenticateToken,
  check_authorization,
} from "../middlewares/authMiddleware";
import { validateLeaveRequest } from "../validators/leaveValidator";

const router = Router();

// Employee routes
router.get("/summary", authenticateToken, getLeaveSummary);
router.get("/history", authenticateToken, getLeaveHistory);
router.get("/approvers", authenticateToken, getApprovers);
router.get("/policies", authenticateToken, getLeavePolicies);
router.post(
  "/submit",
  authenticateToken,
  validateLeaveRequest,
  submitLeaveRequest
);
router.put(
  "/:requestId",
  authenticateToken,
  validateLeaveRequest,
  updateLeaveRequest
);
router.delete("/:requestId", authenticateToken, cancelLeaveRequest);
router.get("/:requestId", authenticateToken, getLeaveRequestById);

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
router.post(
  "/admin/init-policies",
  authenticateToken,
  check_authorization(["admin"]),
  initializeLeavePolicies
);
router.get(
  "/admin/all",
  authenticateToken,
  check_authorization(["admin", "hr", "manager"]),
  getAllLeaveRequests
);
router.put(
  "/admin/:requestId/approve",
  authenticateToken,
  check_authorization(["admin", "hr", "manager"]),
  approveLeaveRequest
);
router.put(
  "/admin/:requestId/reject",
  authenticateToken,
  check_authorization(["admin", "hr", "manager"]),
  rejectLeaveRequest
);

export default router;
