import { Request, Response } from "express";
import mongoose from "mongoose";
import Notification, { INotification } from "../models/notification";
import FCMToken from "../models/fcmToken";
import User from "../models/user";
import FirebaseService from "../services/firebaseService";
import {
  CreateSuccessResponse,
  CreateErrorResponse,
} from "../utils/responseHandler";

interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    email: string;
    role: string;
  };
}

class NotificationController {
  private firebaseService: FirebaseService;

  constructor() {
    this.firebaseService = FirebaseService.getInstance();
  }

  /**
   * Lấy danh sách notifications cho user hiện tại
   */
  public getNotifications = async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!._id);
      const { page = 1, limit = 20, type, isRead, priority } = req.query;

      const options = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        type: type as string,
        isRead:
          isRead === "true" ? true : isRead === "false" ? false : undefined,
        priority: priority as string,
      };

      const notifications = await (Notification as any).getForUser(
        userId,
        options
      );
      const unreadCount = await (Notification as any).getUnreadCount(userId);

      CreateSuccessResponse(res, 200, "Notifications retrieved successfully", {
        notifications,
        unreadCount,
        pagination: {
          page: options.page,
          limit: options.limit,
          total: notifications.length,
        },
      });
    } catch (error) {
      console.error("Error getting notifications:", error);
      CreateErrorResponse(res, 500, "Failed to get notifications");
    }
  };

  /**
   * Đánh dấu notification là đã đọc
   */
  public markAsRead = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { notificationId } = req.params;
      const userId = new mongoose.Types.ObjectId(req.user!._id);

      const notification = await Notification.findById(notificationId);
      if (!notification) {
        return CreateErrorResponse(res, 404, "Notification not found");
      }

      await (notification as any).markAsRead(userId);

      CreateSuccessResponse(res, 200, "Notification marked as read");
    } catch (error) {
      console.error("Error marking notification as read:", error);
      CreateErrorResponse(res, 500, "Failed to mark notification as read");
    }
  };

  /**
   * Đánh dấu tất cả notifications là đã đọc
   */
  public markAllAsRead = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!._id);

      await Notification.updateMany(
        {
          "recipients.userId": userId,
          "recipients.isRead": false,
        },
        {
          $set: {
            "recipients.$.isRead": true,
            "recipients.$.readAt": new Date(),
          },
        }
      );

      CreateSuccessResponse(res, 200, "All notifications marked as read");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      CreateErrorResponse(res, 500, "Failed to mark all notifications as read");
    }
  };

  /**
   * Tạo notification mới (chỉ admin/manager)
   */
  public createNotification = async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const {
        title,
        message,
        type = "system",
        priority = "medium",
        recipientIds,
        data,
        scheduledAt,
        expiresAt,
      } = req.body;

      const senderId = new mongoose.Types.ObjectId(req.user!._id);

      // Validate recipients
      const recipients = recipientIds.map((id: string) => ({
        userId: new mongoose.Types.ObjectId(id),
        isRead: false,
      }));

      const notification = new Notification({
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

      CreateSuccessResponse(
        res,
        201,
        "Notification created successfully",
        notification
      );
    } catch (error) {
      console.error("Error creating notification:", error);
      CreateErrorResponse(res, 500, "Failed to create notification");
    }
  };

  /**
   * Gửi notification đến tất cả users (broadcast)
   */
  public broadcastNotification = async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const {
        title,
        message,
        type = "announcement",
        priority = "medium",
        data,
      } = req.body;

      const senderId = new mongoose.Types.ObjectId(req.user!._id);

      // Lấy tất cả active users
      const users = await User.find({ isActive: true }).select("_id");
      const recipients = users.map((user) => ({
        userId: user._id,
        isRead: false,
      }));

      const notification = new Notification({
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
      const userIds = users.map((user: any) => user._id.toString());
      await this.sendPushNotification(userIds, title, message, data);

      CreateSuccessResponse(
        res,
        201,
        "Broadcast notification sent successfully",
        notification
      );
    } catch (error) {
      console.error("Error broadcasting notification:", error);
      CreateErrorResponse(res, 500, "Failed to broadcast notification");
    }
  };

  /**
   * Đăng ký FCM token
   */
  public registerFCMToken = async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const { token, deviceType, deviceId, deviceInfo } = req.body;

      const userId = new mongoose.Types.ObjectId(req.user!._id);

      const fcmToken = await (FCMToken as any).registerToken(
        userId,
        token,
        deviceType,
        deviceId,
        deviceInfo
      );

      CreateSuccessResponse(
        res,
        200,
        "FCM token registered successfully",
        fcmToken
      );
    } catch (error) {
      console.error("Error registering FCM token:", error);
      CreateErrorResponse(res, 500, "Failed to register FCM token");
    }
  };

  /**
   * Xóa FCM token
   */
  public removeFCMToken = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { token } = req.body;

      await FCMToken.updateOne({ token }, { isActive: false });

      CreateSuccessResponse(res, 200, "FCM token removed successfully");
    } catch (error) {
      console.error("Error removing FCM token:", error);
      CreateErrorResponse(res, 500, "Failed to remove FCM token");
    }
  };

  /**
   * Helper method để gửi push notification
   */
  private async sendPushNotification(
    userIds: string[],
    title: string,
    message: string,
    data?: any
  ) {
    try {
      const objectIds = userIds.map((id) => new mongoose.Types.ObjectId(id));
      const tokens = await (FCMToken as any).getActiveTokensForUsers(objectIds);

      if (tokens.length === 0) {
        console.log("No active FCM tokens found for users");
        return;
      }

      const tokenStrings = tokens.map((t: any) => t.token);

      await this.firebaseService.sendNotificationToMultipleDevices(
        tokenStrings,
        title,
        message,
        data
      );
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  }
}

export default new NotificationController();
