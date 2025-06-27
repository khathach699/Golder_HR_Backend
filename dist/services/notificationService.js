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
                await this.sendPushNotificationToUsers(recipientIds, title, message, data);
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
                data: {
                    ...data,
                    leaveType: type,
                },
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
            await this.firebaseService.sendNotificationToMultipleDevices(tokenStrings, title, message, data);
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
}
exports.default = NotificationService;
