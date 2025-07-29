"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const notification_1 = __importDefault(require("../models/notification"));
const fcmToken_1 = __importDefault(require("../models/fcmToken"));
const user_1 = __importDefault(require("../models/user"));
const firebaseService_1 = __importDefault(require("./firebaseService"));
class NotificationService {
    constructor() {
        this.firebaseService = firebaseService_1.default.getInstance();
    }
    static getInstance() {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }
    /**
     * Tạo và gửi notification đến specific users
     */
    async createAndSendNotification({ title, message, type = "system", priority = "medium", recipientIds, senderId, data = {}, scheduledAt, expiresAt, }) {
        try {
            // Tạo notification trong database
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
                sender: senderId ? new mongoose_1.default.Types.ObjectId(senderId) : undefined,
                data,
                scheduledAt,
                expiresAt,
            });
            await notification.save();
            // Gửi push notification nếu không phải scheduled hoặc đã đến thời gian
            if (!scheduledAt || scheduledAt <= new Date()) {
                // Tạo full notification data cho Firebase
                const fullNotificationData = {
                    ...data,
                    notificationId: notification._id.toString(),
                    type: type,
                    title: title,
                    message: message,
                    priority: priority,
                    timestamp: notification.createdAt || new Date(),
                    isRead: false,
                    isImportant: priority === 'high' || priority === 'urgent',
                    // Thêm các field cần thiết cho NotificationModel
                    category: this.mapTypeToCategory(type),
                    icon: this.getIconForType(type),
                    color: this.getColorForType(type),
                };
                const safeData = this.stringifyDataValues(fullNotificationData);
                await this.sendPushNotificationToUsers(recipientIds, title, message, safeData);
            }
            return notification;
        }
        catch (error) {
            console.error("Error creating and sending notification:", error);
            throw error;
        }
    }
    /**
     * Broadcast notification đến tất cả users
     */
    async broadcastNotification({ title, message, type = "announcement", priority = "medium", senderId, data = {}, }) {
        try {
            // Lấy tất cả active users
            const users = await user_1.default.find({ isActive: true }).select("_id");
            const userIds = users.map((user) => user._id.toString());
            return await this.createAndSendNotification({
                title,
                message,
                type,
                priority,
                recipientIds: userIds,
                senderId,
                data,
            });
        }
        catch (error) {
            console.error("Error broadcasting notification:", error);
            throw error;
        }
    }
    /**
     * Gửi notification cho attendance events
     */
    async sendAttendanceNotification({ userId, type, message, data = {}, }) {
        try {
            const titles = {
                check_in: "Chấm công vào",
                check_out: "Chấm công ra",
                late_arrival: "Đi muộn",
                early_departure: "Về sớm",
            };
            await this.createAndSendNotification({
                title: titles[type],
                message,
                type: "attendance",
                priority: type.includes("late") || type.includes("early") ? "high" : "medium",
                recipientIds: [userId],
                data: {
                    ...data,
                    attendanceType: type,
                },
            });
        }
        catch (error) {
            console.error("Error sending attendance notification:", error);
        }
    }
    /**
     * Gửi notification cho leave requests
     */
    async sendLeaveNotification({ userId, managerId, type, message, data = {}, }) {
        try {
            const titles = {
                request_submitted: "Yêu cầu nghỉ phép đã gửi",
                request_approved: "Yêu cầu nghỉ phép được duyệt",
                request_rejected: "Yêu cầu nghỉ phép bị từ chối",
            };
            const recipientIds = type === "request_submitted" && managerId ? [managerId] : [userId];
            await this.createAndSendNotification({
                title: titles[type],
                message,
                type: "leave",
                priority: "high",
                recipientIds,
                data: this.stringifyDataValues({
                    ...data,
                    leaveType: type,
                }),
            });
        }
        catch (error) {
            console.error("Error sending leave notification:", error);
        }
    }
    /**
     * Gửi reminder notifications
     */
    async sendReminderNotification({ recipientIds, title, message, data = {}, }) {
        try {
            await this.createAndSendNotification({
                title,
                message,
                type: "reminder",
                priority: "medium",
                recipientIds,
                data: {
                    ...data,
                    isReminder: true,
                },
            });
        }
        catch (error) {
            console.error("Error sending reminder notification:", error);
        }
    }
    /**
     * Helper method để gửi push notification đến users
     */
    async sendPushNotificationToUsers(userIds, title, message, data) {
        try {
            const objectIds = userIds.map((id) => new mongoose_1.default.Types.ObjectId(id));
            const tokens = await fcmToken_1.default.getActiveTokensForUsers(objectIds);
            if (tokens.length === 0) {
                console.log("No active FCM tokens found for users");
                return;
            }
            const tokenStrings = tokens.map((t) => t.token);
            // Convert all data values to string for FCM
            const safeData = this.stringifyDataValues(data);
            await this.firebaseService.sendNotificationToMultipleDevices(tokenStrings, title, message, safeData);
        }
        catch (error) {
            console.error("Error sending push notification:", error);
        }
    }
    /**
     * Gửi notification đến topic
     */
    async sendTopicNotification({ topic, title, message, data = {}, }) {
        try {
            await this.firebaseService.sendNotificationToTopic(topic, title, message, data);
        }
        catch (error) {
            console.error("Error sending topic notification:", error);
        }
    }
    /**
     * Schedule notification để gửi sau
     */
    async scheduleNotification({ title, message, type = "reminder", priority = "medium", recipientIds, senderId, data = {}, scheduledAt, expiresAt, }) {
        try {
            return await this.createAndSendNotification({
                title,
                message,
                type,
                priority,
                recipientIds,
                senderId,
                data,
                scheduledAt,
                expiresAt,
            });
        }
        catch (error) {
            console.error("Error scheduling notification:", error);
            throw error;
        }
    }
    /**
     * Send notification when overtime request is submitted
     */
    async sendOvertimeRequestNotification(overtimeRequest) {
        try {
            // Get all HR and admin users - need to populate role to check role name
            const allUsers = await user_1.default.find({
                isActive: true,
            }).populate("role");
            // Filter users with admin or hr role
            const hrUsers = allUsers.filter((user) => user.role && ["admin", "hr"].includes(user.role.name));
            if (hrUsers.length === 0)
                return;
            const recipientIds = hrUsers.map((user) => user._id?.toString() || "");
            const formatDate = (date) => date.toLocaleDateString();
            const formatTime = (date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            await this.createAndSendNotification({
                title: "New Overtime Request",
                message: `${overtimeRequest.employeeName} has submitted an overtime request for ${formatDate(overtimeRequest.date)} (${formatTime(overtimeRequest.startTime)} - ${formatTime(overtimeRequest.endTime)})`,
                type: "overtime_request",
                priority: "high",
                recipientIds,
                data: {
                    overtimeRequestId: overtimeRequest._id.toString(),
                    employeeId: overtimeRequest.employeeId.toString(),
                    employeeName: overtimeRequest.employeeName,
                    date: overtimeRequest.date,
                    hours: overtimeRequest.hours,
                    type: overtimeRequest.type,
                },
            });
        }
        catch (error) {
            console.error("Error sending overtime request notification:", error);
        }
    }
    /**
     * Send notification when overtime request is approved/rejected
     */
    async sendOvertimeApprovalNotification(overtimeRequest, isApproved, rejectionReason) {
        try {
            const formatDate = (date) => date.toLocaleDateString();
            const formatTime = (date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const title = isApproved
                ? "Overtime Request Approved"
                : "Overtime Request Rejected";
            let message = `Your overtime request for ${formatDate(overtimeRequest.date)} (${formatTime(overtimeRequest.startTime)} - ${formatTime(overtimeRequest.endTime)}) has been ${isApproved ? "approved" : "rejected"}.`;
            if (!isApproved && rejectionReason) {
                message += ` Reason: ${rejectionReason}`;
            }
            await this.createAndSendNotification({
                title,
                message,
                type: isApproved ? "overtime_approved" : "overtime_rejected",
                priority: "high",
                recipientIds: [overtimeRequest.employeeId.toString()],
                data: {
                    overtimeRequestId: overtimeRequest._id.toString(),
                    status: overtimeRequest.status,
                    date: overtimeRequest.date,
                    hours: overtimeRequest.hours,
                    type: overtimeRequest.type,
                    rejectionReason: rejectionReason || null,
                },
            });
        }
        catch (error) {
            console.error("Error sending overtime approval notification:", error);
        }
    }
    async getUnreadCount(userId) {
        try {
            return await notification_1.default.countDocuments({
                recipients: {
                    $elemMatch: {
                        userId: new mongoose_1.default.Types.ObjectId(userId),
                        isRead: false,
                    },
                },
            });
        }
        catch (error) {
            console.error("Lỗi khi lấy số lượng thông báo chưa đọc:", error);
            throw error;
        }
    }
    async deleteNotificationForUser(notificationId, userId) {
        try {
            await notification_1.default.updateOne({
                _id: notificationId,
                "recipients.userId": userId,
            }, {
                $set: {
                    "recipients.$.isDeleted": true,
                },
            });
        }
        catch (error) {
            console.error("Lỗi khi xóa thông báo cho người dùng:", error);
            throw error;
        }
    }
    /**
     * Convert all data values to string for FCM compatibility
     */
    stringifyDataValues(data) {
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            if (value !== null && value !== undefined) {
                result[key] = String(value);
            }
        }
        return result;
    }
    /**
     * Map notification type to category for Flutter app
     */
    mapTypeToCategory(type) {
        const categoryMap = {
            'system': 'system',
            'attendance': 'system',
            'leave': 'system',
            'announcement': 'announcement',
            'reminder': 'system',
            'custom': 'custom',
            'overtime': 'system',
            'overtime_request': 'system',
            'overtime_approved': 'system',
            'overtime_rejected': 'system',
            'submitLeaveRequest': 'system',
            'approveLeaveRequest': 'system',
            'rejectLeaveRequest': 'system',
            'calendar': 'system',
        };
        return categoryMap[type] || 'system';
    }
    /**
     * Get icon name for notification type (Flutter icon names)
     */
    getIconForType(type) {
        const iconMap = {
            'system': 'notifications',
            'attendance': 'access_time',
            'leave': 'event_available',
            'announcement': 'campaign',
            'reminder': 'alarm',
            'custom': 'info',
            'overtime': 'schedule',
            'overtime_request': 'schedule',
            'overtime_approved': 'check_circle',
            'overtime_rejected': 'cancel',
            'submitLeaveRequest': 'event_available',
            'approveLeaveRequest': 'check_circle',
            'rejectLeaveRequest': 'cancel',
            'calendar': 'event',
        };
        return iconMap[type] || 'notifications';
    }
    /**
     * Get color for notification type (hex color codes)
     */
    getColorForType(type) {
        const colorMap = {
            'system': '#2196F3',
            'attendance': '#4CAF50',
            'leave': '#FF9800',
            'announcement': '#9C27B0',
            'reminder': '#FF5722',
            'custom': '#607D8B',
            'overtime': '#3F51B5',
            'overtime_request': '#3F51B5',
            'overtime_approved': '#4CAF50',
            'overtime_rejected': '#F44336',
            'submitLeaveRequest': '#FF9800',
            'approveLeaveRequest': '#4CAF50',
            'rejectLeaveRequest': '#F44336',
            'calendar': '#795548',
        };
        return colorMap[type] || '#2196F3';
    }
}
exports.default = NotificationService;
