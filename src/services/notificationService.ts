import mongoose from "mongoose";
import Notification from "../models/notification";
import FCMToken from "../models/fcmToken";
import User from "../models/user";
import FirebaseService from "./firebaseService";
import notification from "../models/notification";

class NotificationService {
  private static instance: NotificationService;
  private firebaseService: FirebaseService;

  private constructor() {
    this.firebaseService = FirebaseService.getInstance();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Tạo và gửi notification đến specific users
   */
  public async createAndSendNotification({
    title,
    message,
    type = "system",
    priority = "medium",
    recipientIds,
    senderId,
    data = {},
    scheduledAt,
    expiresAt,
  }: {
    title: string;
    message: string;
    type?: string;
    priority?: string;
    recipientIds: string[];
    senderId?: string;
    data?: any;
    scheduledAt?: Date;
    expiresAt?: Date;
  }): Promise<any> {
    try {
      // Tạo notification trong database
      const recipients = recipientIds.map((id) => ({
        userId: new mongoose.Types.ObjectId(id),
        isRead: false,
      }));

      const notification = new Notification({
        title,
        message,
        type,
        priority,
        recipients,
        sender: senderId ? new mongoose.Types.ObjectId(senderId) : undefined,
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
        await this.sendPushNotificationToUsers(
          recipientIds,
          title,
          message,
          safeData
        );
      }

      return notification;
    } catch (error) {
      console.error("Error creating and sending notification:", error);
      throw error;
    }
  }

  /**
   * Broadcast notification đến tất cả users
   */
  public async broadcastNotification({
    title,
    message,
    type = "announcement",
    priority = "medium",
    senderId,
    data = {},
  }: {
    title: string;
    message: string;
    type?: string;
    priority?: string;
    senderId?: string;
    data?: any;
  }): Promise<any> {
    try {
      // Lấy tất cả active users
      const users = await User.find({ isActive: true }).select("_id");
      const userIds = users.map((user: any) => user._id.toString());

      return await this.createAndSendNotification({
        title,
        message,
        type,
        priority,
        recipientIds: userIds,
        senderId,
        data,
      });
    } catch (error) {
      console.error("Error broadcasting notification:", error);
      throw error;
    }
  }

  /**
   * Gửi notification cho attendance events
   */
  public async sendAttendanceNotification({
    userId,
    type,
    message,
    data = {},
  }: {
    userId: string;
    type: "check_in" | "check_out" | "late_arrival" | "early_departure";
    message: string;
    data?: any;
  }): Promise<void> {
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
        priority:
          type.includes("late") || type.includes("early") ? "high" : "medium",
        recipientIds: [userId],
        data: {
          ...data,
          attendanceType: type,
        },
      });
    } catch (error) {
      console.error("Error sending attendance notification:", error);
    }
  }

  /**
   * Gửi notification cho leave requests
   */
  public async sendLeaveNotification({
    userId,
    managerId,
    type,
    message,
    data = {},
  }: {
    userId: string;
    managerId?: string;
    type: "request_submitted" | "request_approved" | "request_rejected";
    message: string;
    data?: any;
  }): Promise<void> {
    try {
      const titles = {
        request_submitted: "Yêu cầu nghỉ phép đã gửi",
        request_approved: "Yêu cầu nghỉ phép được duyệt",
        request_rejected: "Yêu cầu nghỉ phép bị từ chối",
      };

      const recipientIds =
        type === "request_submitted" && managerId ? [managerId] : [userId];

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
    } catch (error) {
      console.error("Error sending leave notification:", error);
    }
  }

  /**
   * Gửi reminder notifications
   */
  public async sendReminderNotification({
    recipientIds,
    title,
    message,
    data = {},
  }: {
    recipientIds: string[];
    title: string;
    message: string;
    data?: any;
  }): Promise<void> {
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
    } catch (error) {
      console.error("Error sending reminder notification:", error);
    }
  }

  /**
   * Helper method để gửi push notification đến users
   */
  private async sendPushNotificationToUsers(
    userIds: string[],
    title: string,
    message: string,
    data?: any
  ): Promise<void> {
    try {
      const objectIds = userIds.map((id) => new mongoose.Types.ObjectId(id));
      const tokens = await (FCMToken as any).getActiveTokensForUsers(objectIds);

      if (tokens.length === 0) {
        console.log("No active FCM tokens found for users");
        return;
      }

      const tokenStrings = tokens.map((t: any) => t.token);
      // Convert all data values to string for FCM
      const safeData = this.stringifyDataValues(data);
      await this.firebaseService.sendNotificationToMultipleDevices(
        tokenStrings,
        title,
        message,
        safeData
      );
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  }



  /**
   * Gửi notification đến topic
   */
  public async sendTopicNotification({
    topic,
    title,
    message,
    data = {},
  }: {
    topic: string;
    title: string;
    message: string;
    data?: any;
  }): Promise<void> {
    try {
      await this.firebaseService.sendNotificationToTopic(
        topic,
        title,
        message,
        data
      );
    } catch (error) {
      console.error("Error sending topic notification:", error);
    }
  }

  /**
   * Schedule notification để gửi sau
   */
  public async scheduleNotification({
    title,
    message,
    type = "reminder",
    priority = "medium",
    recipientIds,
    senderId,
    data = {},
    scheduledAt,
    expiresAt,
  }: {
    title: string;
    message: string;
    type?: string;
    priority?: string;
    recipientIds: string[];
    senderId?: string;
    data?: any;
    scheduledAt: Date;
    expiresAt?: Date;
  }): Promise<any> {
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
    } catch (error) {
      console.error("Error scheduling notification:", error);
      throw error;
    }
  }

  /**
   * Send notification when overtime request is submitted
   */
  public async sendOvertimeRequestNotification(
    overtimeRequest: any
  ): Promise<void> {
    try {
      // Get all HR and admin users - need to populate role to check role name
      const allUsers = await User.find({
        isActive: true,
      }).populate("role");

      // Filter users with admin or hr role
      const hrUsers = allUsers.filter(
        (user) => user.role && ["admin", "hr"].includes((user.role as any).name)
      );

      if (hrUsers.length === 0) return;

      const recipientIds = hrUsers.map((user) => user._id?.toString() || "");
      const formatDate = (date: Date) => date.toLocaleDateString();
      const formatTime = (date: Date) =>
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      await this.createAndSendNotification({
        title: "New Overtime Request",
        message: `${
          overtimeRequest.employeeName
        } has submitted an overtime request for ${formatDate(
          overtimeRequest.date
        )} (${formatTime(overtimeRequest.startTime)} - ${formatTime(
          overtimeRequest.endTime
        )})`,
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
    } catch (error) {
      console.error("Error sending overtime request notification:", error);
    }
  }

  /**
   * Send notification when overtime request is approved/rejected
   */
  public async sendOvertimeApprovalNotification(
    overtimeRequest: any,
    isApproved: boolean,
    rejectionReason?: string
  ): Promise<void> {
    try {
      const formatDate = (date: Date) => date.toLocaleDateString();
      const formatTime = (date: Date) =>
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const title = isApproved
        ? "Overtime Request Approved"
        : "Overtime Request Rejected";
      let message = `Your overtime request for ${formatDate(
        overtimeRequest.date
      )} (${formatTime(overtimeRequest.startTime)} - ${formatTime(
        overtimeRequest.endTime
      )}) has been ${isApproved ? "approved" : "rejected"}.`;

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
    } catch (error) {
      console.error("Error sending overtime approval notification:", error);
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await Notification.countDocuments({
        recipients: {
          $elemMatch: {
            userId: new mongoose.Types.ObjectId(userId),
            isRead: false,
          },
        },
      });
    } catch (error) {
      console.error("Lỗi khi lấy số lượng thông báo chưa đọc:", error);
      throw error;
    }
  }

  async deleteNotificationForUser(
    notificationId: string,
    userId: string
  ): Promise<void> {
    try {
      await Notification.updateOne(
        {
          _id: notificationId,
          "recipients.userId": userId,
        },
        {
          $set: {
            "recipients.$.isDeleted": true,
          },
        }
      );
    } catch (error) {
      console.error("Lỗi khi xóa thông báo cho người dùng:", error);
      throw error;
    }
  }

  /**
   * Convert all data values to string for FCM compatibility
   */
  private stringifyDataValues(data: any): { [key: string]: string } {
    const result: { [key: string]: string } = {};
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
  private mapTypeToCategory(type: string): string {
    const categoryMap: { [key: string]: string } = {
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
  private getIconForType(type: string): string {
    const iconMap: { [key: string]: string } = {
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
  private getColorForType(type: string): string {
    const colorMap: { [key: string]: string } = {
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

export default NotificationService;
