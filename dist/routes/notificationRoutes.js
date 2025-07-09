"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const notificationController_1 = __importDefault(require("../controllers/notificationController"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const validationMiddleware_1 = require("../middlewares/validationMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
router.get("/", [
    (0, express_validator_1.query)("page").optional().isInt({ min: 1 }),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)("type")
        .optional()
        .isIn([
        "system",
        "attendance",
        "leave",
        "announcement",
        "reminder",
        "custom",
    ]),
    (0, express_validator_1.query)("isRead").optional().isBoolean(),
    (0, express_validator_1.query)("priority").optional().isIn(["low", "medium", "high", "urgent"]),
], validationMiddleware_1.validateRequest, notificationController_1.default.getNotifications);
router.get("/:notificationId/read", [(0, express_validator_1.param)("notificationId").isMongoId().withMessage("Invalid notification ID")], validationMiddleware_1.validateRequest, notificationController_1.default.markAsRead);
router.get("/unread-count", notificationController_1.default.getUnreadCount);
router.get("/read-all", notificationController_1.default.markAllAsRead);
router.post("/", [
    (0, express_validator_1.body)("title")
        .notEmpty()
        .isLength({ max: 200 })
        .withMessage("Title is required and must be less than 200 characters"),
    (0, express_validator_1.body)("message")
        .notEmpty()
        .isLength({ max: 1000 })
        .withMessage("Message is required and must be less than 1000 characters"),
    (0, express_validator_1.body)("type")
        .optional()
        .isIn([
        "system",
        "attendance",
        "leave",
        "announcement",
        "reminder",
        "custom",
    ]),
    (0, express_validator_1.body)("priority").optional().isIn(["low", "medium", "high", "urgent"]),
    (0, express_validator_1.body)("recipientIds")
        .isArray({ min: 1 })
        .withMessage("At least one recipient is required"),
    (0, express_validator_1.body)("recipientIds.*").isMongoId().withMessage("Invalid recipient ID"),
    (0, express_validator_1.body)("scheduledAt")
        .optional()
        .isISO8601()
        .withMessage("Invalid scheduled date"),
    (0, express_validator_1.body)("expiresAt").optional().isISO8601().withMessage("Invalid expiry date"),
], validationMiddleware_1.validateRequest, notificationController_1.default.createNotification);
router.post("/broadcast", [
    (0, express_validator_1.body)("title")
        .notEmpty()
        .isLength({ max: 200 })
        .withMessage("Title is required and must be less than 200 characters"),
    (0, express_validator_1.body)("message")
        .notEmpty()
        .isLength({ max: 1000 })
        .withMessage("Message is required and must be less than 1000 characters"),
    (0, express_validator_1.body)("type")
        .optional()
        .isIn([
        "system",
        "attendance",
        "leave",
        "announcement",
        "reminder",
        "custom",
    ]),
    (0, express_validator_1.body)("priority").optional().isIn(["low", "medium", "high", "urgent"]),
], validationMiddleware_1.validateRequest, notificationController_1.default.broadcastNotification);
router.post("/fcm-token", [
    (0, express_validator_1.body)("token").notEmpty().withMessage("FCM token is required"),
    (0, express_validator_1.body)("deviceType")
        .isIn(["android", "ios", "web"])
        .withMessage("Invalid device type"),
    (0, express_validator_1.body)("deviceId").optional().isString(),
    (0, express_validator_1.body)("deviceInfo").optional().isObject(),
], validationMiddleware_1.validateRequest, notificationController_1.default.registerFCMToken);
router.delete("/fcm-token", [(0, express_validator_1.body)("token").notEmpty().withMessage("FCM token is required")], validationMiddleware_1.validateRequest, notificationController_1.default.removeFCMToken);
router.delete("/:notificationId", [(0, express_validator_1.param)("notificationId").isMongoId().withMessage("Invalid notification ID")], validationMiddleware_1.validateRequest, notificationController_1.default.deleteNotification);
// Admin notification endpoint
router.post("/admin/new-request", [
    (0, express_validator_1.body)("requestType")
        .notEmpty()
        .isIn(["leave", "overtime"])
        .withMessage("Request type must be leave or overtime"),
    (0, express_validator_1.body)("requestId").notEmpty().withMessage("Request ID is required"),
    (0, express_validator_1.body)("employeeName").notEmpty().withMessage("Employee name is required"),
    (0, express_validator_1.body)("requestDetails")
        .notEmpty()
        .withMessage("Request details are required"),
], validationMiddleware_1.validateRequest, notificationController_1.default.notifyAdminNewRequest);
exports.default = router;
