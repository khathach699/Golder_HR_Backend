import { Router } from "express";
import { body, param, query } from "express-validator";
import notificationController from "../controllers/notificationController";
import { authenticateToken } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validationMiddleware";

const router = Router();

router.use(authenticateToken);

router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("type")
      .optional()
      .isIn([
        "system",
        "attendance",
        "leave",
        "announcement",
        "reminder",
        "custom",
      ]),
    query("isRead").optional().isBoolean(),
    query("priority").optional().isIn(["low", "medium", "high", "urgent"]),
  ],
  validateRequest,
  notificationController.getNotifications
);

router.patch(
  "/:notificationId/read",
  [param("notificationId").isMongoId().withMessage("Invalid notification ID")],
  validateRequest,
  notificationController.markAsRead
);

router.patch("/read-all", notificationController.markAllAsRead);

router.post(
  "/",
  [
    body("title")
      .notEmpty()
      .isLength({ max: 200 })
      .withMessage("Title is required and must be less than 200 characters"),
    body("message")
      .notEmpty()
      .isLength({ max: 1000 })
      .withMessage("Message is required and must be less than 1000 characters"),
    body("type")
      .optional()
      .isIn([
        "system",
        "attendance",
        "leave",
        "announcement",
        "reminder",
        "custom",
      ]),
    body("priority").optional().isIn(["low", "medium", "high", "urgent"]),
    body("recipientIds")
      .isArray({ min: 1 })
      .withMessage("At least one recipient is required"),
    body("recipientIds.*").isMongoId().withMessage("Invalid recipient ID"),
    body("scheduledAt")
      .optional()
      .isISO8601()
      .withMessage("Invalid scheduled date"),
    body("expiresAt").optional().isISO8601().withMessage("Invalid expiry date"),
  ],
  validateRequest,
  notificationController.createNotification
);

router.post(
  "/broadcast",
  [
    body("title")
      .notEmpty()
      .isLength({ max: 200 })
      .withMessage("Title is required and must be less than 200 characters"),
    body("message")
      .notEmpty()
      .isLength({ max: 1000 })
      .withMessage("Message is required and must be less than 1000 characters"),
    body("type")
      .optional()
      .isIn([
        "system",
        "attendance",
        "leave",
        "announcement",
        "reminder",
        "custom",
      ]),
    body("priority").optional().isIn(["low", "medium", "high", "urgent"]),
  ],
  validateRequest,
  notificationController.broadcastNotification
);

router.post(
  "/fcm-token",
  [
    body("token").notEmpty().withMessage("FCM token is required"),
    body("deviceType")
      .isIn(["android", "ios", "web"])
      .withMessage("Invalid device type"),
    body("deviceId").optional().isString(),
    body("deviceInfo").optional().isObject(),
  ],
  validateRequest,
  notificationController.registerFCMToken
);

router.delete(
  "/fcm-token",
  [body("token").notEmpty().withMessage("FCM token is required")],
  validateRequest,
  notificationController.removeFCMToken
);

// Admin notification endpoint
router.post(
  "/admin/new-request",
  [
    body("requestType")
      .notEmpty()
      .isIn(["leave", "overtime"])
      .withMessage("Request type must be leave or overtime"),
    body("requestId").notEmpty().withMessage("Request ID is required"),
    body("employeeName").notEmpty().withMessage("Employee name is required"),
    body("requestDetails")
      .notEmpty()
      .withMessage("Request details are required"),
  ],
  validateRequest,
  notificationController.notifyAdminNewRequest
);

export default router;
