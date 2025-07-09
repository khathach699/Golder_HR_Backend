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
const notificationService_1 = __importDefault(require("../services/notificationService"));
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
                    "recipients.isDeleted": false,
                    isActive: true,
                    $and: [
                        {
                            $or: [
                                { scheduledAt: { $lte: new Date() } },
                                { scheduledAt: { $exists: false } },
                            ],
                        },
                        {
                            $or: [
                                { expiresAt: { $gt: new Date() } },
                                { expiresAt: { $exists: false } },
                            ],
                        },
                    ],
                }, {
                    $set: {
                        "recipients.$.isRead": true,
                        "recipients.$.readAt": new Date(),
                        "recipients.$.isDeleted": true,
                    },
                });
                (0, responseHandler_1.CreateSuccessResponse)(res, 200, "All notifications marked as read");
            }
            catch (error) {
                (0, responseHandler_1.CreateErrorResponse)(res, 500, "Failed to mark all notifications as read");
            }
        };
        this.getUnreadCount = async (req, res) => {
            try {
                const userId = new mongoose_1.default.Types.ObjectId(req.user._id);
                const count = await notification_1.default.getUnreadCount(userId);
                (0, responseHandler_1.CreateSuccessResponse)(res, 200, "Unread count retrieved successfully", {
                    unreadCount: count,
                });
            }
            catch (error) {
                (0, responseHandler_1.CreateErrorResponse)(res, 500, "Failed to get unread count");
            }
        };
        this.deleteNotification = async (req, res) => {
            try {
                const { notificationId } = req.params;
                const userId = req.user._id.toString();
                await notificationService_1.default.getInstance().deleteNotificationForUser(notificationId, userId);
                (0, responseHandler_1.CreateSuccessResponse)(res, 200, "Notification deleted successfully");
            }
            catch (error) {
                console.error("Lỗi khi xóa mềm notification:", error);
                (0, responseHandler_1.CreateErrorResponse)(res, 500, "Failed to delete notification");
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
                (0, responseHandler_1.CreateErrorResponse)(res, 500, "Failed to remove FCM token");
            }
        };
        /**
         * Gửi thông báo đến admin khi có request mới
         */
        this.notifyAdminNewRequest = async (req, res) => {
            try {
                const { requestType, requestId, employeeName, requestDetails } = req.body;
                // 1. Kiểm tra dữ liệu đầu vào
                if (!requestType || !requestId || !employeeName || !requestDetails) {
                    return (0, responseHandler_1.CreateErrorResponse)(res, 400, "Missing required fields");
                }
                console.log("📋 Admin notification request received:", {
                    requestType,
                    requestId,
                    employeeName,
                    requestDetails,
                });
                const adminUsers = await user_1.default.find({ isdisable: false })
                    .populate("role")
                    .select("_id fullname role");
                const filteredAdminUsers = adminUsers.filter((user) => user.role &&
                    typeof user.role === "object" &&
                    user.role.name === "admin");
                const adminIds = filteredAdminUsers.map((admin) => admin.id.toString());
                // 4. Nếu không có admin nào, log cảnh báo nhưng không trả lỗi
                if (adminIds.length === 0) {
                    return (0, responseHandler_1.CreateSuccessResponse)(res, 200, "No admin to notify (skipped)", {
                        notifiedAdmins: 0,
                        adminIds: [],
                    });
                }
                // 5. Tạo tiêu đề và nội dung thông báo
                const title = requestType === "leave"
                    ? "Đơn xin nghỉ phép mới"
                    : "Đơn làm thêm giờ mới";
                const message = `${employeeName} đã gửi ${requestDetails}`;
                // 6. Gửi thông báo qua NotificationService
                const notificationService = notificationService_1.default.getInstance();
                await notificationService.createAndSendNotification({
                    title,
                    message,
                    type: requestType, // leave | overtime
                    priority: "high",
                    recipientIds: adminIds,
                    senderId: req.user?._id,
                    data: {
                        requestType,
                        requestId,
                        employeeName,
                        requestDetails,
                    },
                });
                // 7. Trả kết quả thành công
                return (0, responseHandler_1.CreateSuccessResponse)(res, 200, "Admin notification sent successfully", {
                    notifiedAdmins: adminIds.length,
                    adminIds,
                });
            }
            catch (error) {
                return (0, responseHandler_1.CreateErrorResponse)(res, 500, "Failed to send admin notification");
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
