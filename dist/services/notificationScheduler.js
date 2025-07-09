"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const notification_1 = __importDefault(require("../models/notification"));
const notificationService_1 = __importDefault(require("./notificationService"));
class NotificationScheduler {
    constructor() {
        this.isRunning = false;
        this.notificationService = notificationService_1.default.getInstance();
    }
    static getInstance() {
        if (!NotificationScheduler.instance) {
            NotificationScheduler.instance = new NotificationScheduler();
        }
        return NotificationScheduler.instance;
    }
    /**
     * Khởi động scheduler
     */
    start() {
        if (this.isRunning) {
            console.log("Notification scheduler is already running");
            return;
        }
        // Chạy mỗi phút để check scheduled notifications
        node_cron_1.default.schedule("* * * * *", async () => {
            await this.processScheduledNotifications();
        });
        // Chạy mỗi ngày lúc 9:00 AM để gửi daily reminders
        node_cron_1.default.schedule("0 9 * * *", async () => {
            await this.sendDailyReminders();
        });
        // Chạy mỗi thứ 2 lúc 9:00 AM để gửi weekly reminders
        node_cron_1.default.schedule("0 9 * * 1", async () => {
            await this.sendWeeklyReminders();
        });
        // Cleanup expired notifications mỗi ngày lúc 2:00 AM
        node_cron_1.default.schedule("0 2 * * *", async () => {
            await this.cleanupExpiredNotifications();
        });
        this.isRunning = true;
        console.log("Notification scheduler started");
    }
    /**
     * Dừng scheduler
     */
    stop() {
        this.isRunning = false;
        console.log("Notification scheduler stopped");
    }
    /**
     * Xử lý scheduled notifications
     */
    async processScheduledNotifications() {
        try {
            const now = new Date();
            // Tìm notifications đã đến thời gian gửi
            const scheduledNotifications = await notification_1.default.find({
                scheduledAt: { $lte: now },
                isActive: true,
                $or: [{ expiresAt: { $gt: now } }, { expiresAt: { $exists: false } }],
            }).populate("recipients.userId", "email name");
            for (const notification of scheduledNotifications) {
                try {
                    // Lấy danh sách user IDs
                    const userIds = notification.recipients.map((r) => r.userId._id.toString());
                    // Gửi push notification
                    await this.notificationService["sendPushNotificationToUsers"](userIds, notification.title, notification.message, notification.data);
                    // Cập nhật notification để không gửi lại
                    notification.scheduledAt = undefined;
                    await notification.save();
                    console.log(`Sent scheduled notification: ${notification.title}`);
                }
                catch (error) {
                    console.error(`Error sending scheduled notification ${notification._id}:`, error);
                }
            }
        }
        catch (error) {
            console.error("Error processing scheduled notifications:", error);
        }
    }
    /**
     * Gửi daily reminders
     */
    async sendDailyReminders() {
        try {
            // Ví dụ: Nhắc nhở chấm công
            await this.notificationService.sendTopicNotification({
                topic: "all_employees",
                title: "Nhắc nhở chấm công",
                message: "Đừng quên chấm công khi đến và rời khỏi văn phòng!",
                data: {
                    type: "daily_reminder",
                    category: "attendance",
                },
            });
            console.log("Daily reminders sent");
        }
        catch (error) {
            console.error("Error sending daily reminders:", error);
        }
    }
    /**
     * Gửi weekly reminders
     */
    async sendWeeklyReminders() {
        try {
            // Ví dụ: Báo cáo tuần
            await this.notificationService.sendTopicNotification({
                topic: "all_employees",
                title: "Báo cáo tuần",
                message: "Hãy xem lại báo cáo chấm công tuần này và liên hệ HR nếu có sai sót.",
                data: {
                    type: "weekly_reminder",
                    category: "report",
                },
            });
            console.log("Weekly reminders sent");
        }
        catch (error) {
            console.error("Error sending weekly reminders:", error);
        }
    }
    /**
     * Cleanup expired notifications
     */
    async cleanupExpiredNotifications() {
        try {
            const now = new Date();
            // Deactivate expired notifications
            const result = await notification_1.default.updateMany({
                expiresAt: { $lt: now },
                isActive: true,
            }, {
                isActive: false,
            });
            console.log(`Cleaned up ${result.modifiedCount} expired notifications`);
        }
        catch (error) {
            console.error("Error cleaning up expired notifications:", error);
        }
    }
    /**
     * Gửi notification cho birthday reminders
     */
    async sendBirthdayReminders() {
        try {
            // Implement birthday logic here
            // This would typically check user birthdays and send notifications
            console.log("Birthday reminders feature - to be implemented");
        }
        catch (error) {
            console.error("Error sending birthday reminders:", error);
        }
    }
    /**
     * Gửi notification cho meeting reminders
     */
    async sendMeetingReminders() {
        try {
            // Implement meeting reminder logic here
            console.log("Meeting reminders feature - to be implemented");
        }
        catch (error) {
            console.error("Error sending meeting reminders:", error);
        }
    }
}
exports.default = NotificationScheduler;
