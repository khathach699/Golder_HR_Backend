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
// Middleware xác thực cho tất cả routes
router.use(authMiddleware_1.authenticateToken);
/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         message:
 *           type: string
 *         type:
 *           type: string
 *           enum: [system, attendance, leave, announcement, reminder, custom]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         recipients:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               isRead:
 *                 type: boolean
 *               readAt:
 *                 type: string
 *                 format: date-time
 *         sender:
 *           type: string
 *         data:
 *           type: object
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *         expiresAt:
 *           type: string
 *           format: date-time
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Lấy danh sách notifications của user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Số lượng notifications per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [system, attendance, leave, announcement, reminder, custom]
 *         description: Lọc theo loại notification
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái đã đọc
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Lọc theo độ ưu tiên
 *     responses:
 *       200:
 *         description: Danh sách notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     unreadCount:
 *                       type: integer
 *                     pagination:
 *                       type: object
 */
router.get('/', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('type').optional().isIn(['system', 'attendance', 'leave', 'announcement', 'reminder', 'custom']),
    (0, express_validator_1.query)('isRead').optional().isBoolean(),
    (0, express_validator_1.query)('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], validationMiddleware_1.validateRequest, notificationController_1.default.getNotifications);
/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   patch:
 *     summary: Đánh dấu notification là đã đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của notification
 *     responses:
 *       200:
 *         description: Notification đã được đánh dấu là đã đọc
 */
router.patch('/:notificationId/read', [
    (0, express_validator_1.param)('notificationId').isMongoId().withMessage('Invalid notification ID')
], validationMiddleware_1.validateRequest, notificationController_1.default.markAsRead);
/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Đánh dấu tất cả notifications là đã đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tất cả notifications đã được đánh dấu là đã đọc
 */
router.patch('/read-all', notificationController_1.default.markAllAsRead);
/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Tạo notification mới (Admin/Manager only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *               - recipientIds
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               message:
 *                 type: string
 *                 maxLength: 1000
 *               type:
 *                 type: string
 *                 enum: [system, attendance, leave, announcement, reminder, custom]
 *                 default: system
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *               recipientIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               data:
 *                 type: object
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Notification được tạo thành công
 */
router.post('/', [
    (0, express_validator_1.body)('title').notEmpty().isLength({ max: 200 }).withMessage('Title is required and must be less than 200 characters'),
    (0, express_validator_1.body)('message').notEmpty().isLength({ max: 1000 }).withMessage('Message is required and must be less than 1000 characters'),
    (0, express_validator_1.body)('type').optional().isIn(['system', 'attendance', 'leave', 'announcement', 'reminder', 'custom']),
    (0, express_validator_1.body)('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    (0, express_validator_1.body)('recipientIds').isArray({ min: 1 }).withMessage('At least one recipient is required'),
    (0, express_validator_1.body)('recipientIds.*').isMongoId().withMessage('Invalid recipient ID'),
    (0, express_validator_1.body)('scheduledAt').optional().isISO8601().withMessage('Invalid scheduled date'),
    (0, express_validator_1.body)('expiresAt').optional().isISO8601().withMessage('Invalid expiry date')
], validationMiddleware_1.validateRequest, notificationController_1.default.createNotification);
/**
 * @swagger
 * /api/notifications/broadcast:
 *   post:
 *     summary: Gửi notification đến tất cả users (Admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               message:
 *                 type: string
 *                 maxLength: 1000
 *               type:
 *                 type: string
 *                 enum: [system, attendance, leave, announcement, reminder, custom]
 *                 default: announcement
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *               data:
 *                 type: object
 *     responses:
 *       201:
 *         description: Broadcast notification gửi thành công
 */
router.post('/broadcast', [
    (0, express_validator_1.body)('title').notEmpty().isLength({ max: 200 }).withMessage('Title is required and must be less than 200 characters'),
    (0, express_validator_1.body)('message').notEmpty().isLength({ max: 1000 }).withMessage('Message is required and must be less than 1000 characters'),
    (0, express_validator_1.body)('type').optional().isIn(['system', 'attendance', 'leave', 'announcement', 'reminder', 'custom']),
    (0, express_validator_1.body)('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], validationMiddleware_1.validateRequest, notificationController_1.default.broadcastNotification);
/**
 * @swagger
 * /api/notifications/fcm-token:
 *   post:
 *     summary: Đăng ký FCM token
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - deviceType
 *             properties:
 *               token:
 *                 type: string
 *               deviceType:
 *                 type: string
 *                 enum: [android, ios, web]
 *               deviceId:
 *                 type: string
 *               deviceInfo:
 *                 type: object
 *                 properties:
 *                   model:
 *                     type: string
 *                   brand:
 *                     type: string
 *                   osVersion:
 *                     type: string
 *                   appVersion:
 *                     type: string
 *     responses:
 *       200:
 *         description: FCM token đăng ký thành công
 */
router.post('/fcm-token', [
    (0, express_validator_1.body)('token').notEmpty().withMessage('FCM token is required'),
    (0, express_validator_1.body)('deviceType').isIn(['android', 'ios', 'web']).withMessage('Invalid device type'),
    (0, express_validator_1.body)('deviceId').optional().isString(),
    (0, express_validator_1.body)('deviceInfo').optional().isObject()
], validationMiddleware_1.validateRequest, notificationController_1.default.registerFCMToken);
/**
 * @swagger
 * /api/notifications/fcm-token:
 *   delete:
 *     summary: Xóa FCM token
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: FCM token đã được xóa
 */
router.delete('/fcm-token', [
    (0, express_validator_1.body)('token').notEmpty().withMessage('FCM token is required')
], validationMiddleware_1.validateRequest, notificationController_1.default.removeFCMToken);
exports.default = router;
