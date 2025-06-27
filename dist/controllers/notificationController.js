"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const notification_1 = __importDefault(require("../models/notification"));
const fcmToken_1 = __importDefault(require("../models/fcmToken"));
const user_1 = __importDefault(require("../models/user"));
const firebaseService_1 = __importDefault(require("../services/firebaseService"));
const responseHandler_1 = require("../utils/responseHandler");
class NotificationController {
    constructor() {
        /**
         * Lấy danh sách notifications cho user hiện tại
         */
        this.getNotifications = async (req, res) => {
            try {
                const userId = new mongoose_1.default.Types.ObjectId(req.user._id);
                const { page = 1, limit = 20, type, isRead, priority } = req.query;
                const options = {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    type: type,
                    isRead: isRead === "true" ? true : isRead === "false" ? false : undefined,
                    priority: priority,
                };
                const notifications = await notification_1.default.getForUser(userId, options);
                const unreadCount = await notification_1.default.getUnreadCount(userId);
                (0, responseHandler_1.CreateSuccessResponse)(res, 200, "Notifications retrieved successfully", {
                    notifications,
                    unreadCount,
                    pagination: {
                        page: options.page,
                        limit: options.limit,
                        total: notifications.length,
                    },
                });
            }
            catch (error) {
                console.error("Error getting notifications:", error);
                (0, responseHandler_1.CreateErrorResponse)(res, 500, "Failed to get notifications");
            }
        };
        /**
         * Đánh dấu notification là đã đọc
         */
        this.markAsRead = async (req, res) => {
            try {
                const { notificationId } = req.params;
                const userId = new mongoose_1.default.Types.ObjectId(req.user._id);
                const notification = await notification_1.default.findById(notificationId);
                if (!notification) {
                    return (0, responseHandler_1.CreateErrorResponse)(res, 404, "Notification not found");
                }
                await notification.markAsRead(userId);
                (0, responseHandler_1.CreateSuccessResponse)(res, 200, "Notification marked as read");
            }
            catch (error) {
                console.error("Error marking notification as read:", error);
                (0, responseHandler_1.CreateErrorResponse)(res, 500, "Failed to mark notification as read");
            }
        };
        /**
         * Đánh dấu tất cả notifications là đã đọc
         */
        this.markAllAsRead = async (req, res) => {
            try {
                const userId = new mongoose_1.default.Types.ObjectId(req.user._id);
                await notification_1.default.updateMany({
                    "recipients.userId": userId,
                    "recipients.isRead": false,
                }, {
                    $set: {
                        "recipients.$.isRead": true,
                        "recipients.$.readAt": new Date(),
                    },
                });
                (0, responseHandler_1.CreateSuccessResponse)(res, 200, "All notifications marked as read");
            }
            catch (error) {
                console.error("Error marking all notifications as read:", error);
                (0, responseHandler_1.CreateErrorResponse)(res, 500, "Failed to mark all notifications as read");
            }
        };
        /**
         * Tạo notification mới (chỉ admin/manager)
         */
        this.createNotification = async (req, res) => {
            try {
                const { title, message, type = "system", priority = "medium", recipientIds, data, scheduledAt, expiresAt, } = req.body;
                const senderId = new mongoose_1.default.Types.ObjectId(req.user._id);
                // Validate recipients
                const recipients = recipientIds.map((id) => ({
                    userId: new mongoose_1.default.Types.ObjectId(id),
                    isRead: false,
                }));
                const notification = new notification_1.default({
                    title,
                    message,
                    type,
                    priority,
                    recipients,
                    sender: senderId,
                    data,
                    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
                    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
                });
                await notification.save();
                // Gửi push notification nếu không phải scheduled
                if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
                    await this.sendPushNotification(recipientIds, title, message, data);
                }
                (0, responseHandler_1.CreateSuccessResponse)(res, 201, "Notification created successfully", notification);
            }
            catch (error) {
                console.error("Error creating notification:", error);
                (0, responseHandler_1.CreateErrorResponse)(res, 500, "Failed to create notification");
            }
        };
        /**
         * Gửi notification đến tất cả users (broadcast)
         */
        this.broadcastNotification = async (req, res) => {
            try {
                const { title, message, type = "announcement", priority = "medium", data, } = req.body;
                const senderId = new mongoose_1.default.Types.ObjectId(req.user._id);
                // Lấy tất cả active users
                const users = await user_1.default.find({ isActive: true }).select("_id");
                const recipients = users.map((user) => ({
                    userId: user._id,
                    isRead: false,
                }));
                const notification = new notification_1.default({
                    title,
                    message,
                    type,
                    priority,
                    recipients,
                    sender: senderId,
                    data,
                });
                await notification.save();
                // Gửi push notification đến tất cả users
                const userIds = users.map((user) => user._id.toString());
                await this.sendPushNotification(userIds, title, message, data);
                (0, responseHandler_1.CreateSuccessResponse)(res, 201, "Broadcast notification sent successfully", notification);
            }
            catch (error) {
                console.error("Error broadcasting notification:", error);
                (0, responseHandler_1.CreateErrorResponse)(res, 500, "Failed to broadcast notification");
            }
        };
        /**
         * Đăng ký FCM token
         */
        this.registerFCMToken = async (req, res) => {
            try {
                const { token, deviceType, deviceId, deviceInfo } = req.body;
                const userId = new mongoose_1.default.Types.ObjectId(req.user._id);
                const fcmToken = await fcmToken_1.default.registerToken(userId, token, deviceType, deviceId, deviceInfo);
                (0, responseHandler_1.CreateSuccessResponse)(res, 200, "FCM token registered successfully", fcmToken);
            }
            catch (error) {
                console.error("Error registering FCM token:", error);
                (0, responseHandler_1.CreateErrorResponse)(res, 500, "Failed to register FCM token");
            }
        };
        /**
         * Xóa FCM token
         */
        this.removeFCMToken = async (req, res) => {
            try {
                const { token } = req.body;
                await fcmToken_1.default.updateOne({ token }, { isActive: false });
                (0, responseHandler_1.CreateSuccessResponse)(res, 200, "FCM token removed successfully");
            }
            catch (error) {
                console.error("Error removing FCM token:", error);
                (0, responseHandler_1.CreateErrorResponse)(res, 500, "Failed to remove FCM token");
            }
        };
        this.firebaseService = firebaseService_1.default.getInstance();
    }
    /**
     * Helper method để gửi push notification
     */
    async sendPushNotification(userIds, title, message, data) {
        try {
            const objectIds = userIds.map((id) => new mongoose_1.default.Types.ObjectId(id));
            const tokens = await fcmToken_1.default.getActiveTokensForUsers(objectIds);
            if (tokens.length === 0) {
                console.log("No active FCM tokens found for users");
                return;
            }
            const tokenStrings = tokens.map((t) => t.token);
            await this.firebaseService.sendNotificationToMultipleDevices(tokenStrings, title, message, data);
        }
        catch (error) {
            console.error("Error sending push notification:", error);
        }
    }
}
exports.default = new NotificationController();
