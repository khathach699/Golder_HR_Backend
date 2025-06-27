import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type:
    | "system"
    | "attendance"
    | "leave"
    | "announcement"
    | "reminder"
    | "custom";
  priority: "low" | "medium" | "high" | "urgent";
  recipients: {
    userId: mongoose.Types.ObjectId;
    isRead: boolean;
    readAt?: Date;
  }[];
  sender?: mongoose.Types.ObjectId; // User who sent the notification
  data?: { [key: string]: any }; // Additional data for the notification
  scheduledAt?: Date; // For scheduled notifications
  expiresAt?: Date; // When notification expires
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: [
        "system",
        "attendance",
        "leave",
        "announcement",
        "reminder",
        "custom",
      ],
      default: "system",
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      required: true,
    },
    recipients: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        isRead: {
          type: Boolean,
          default: false,
        },
        readAt: {
          type: Date,
        },
      },
    ],
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    scheduledAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
NotificationSchema.index({ "recipients.userId": 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ priority: 1, createdAt: -1 });
NotificationSchema.index({ isActive: 1, createdAt: -1 });
NotificationSchema.index({ scheduledAt: 1 });
NotificationSchema.index({ expiresAt: 1 });

// Virtual for unread count per user
NotificationSchema.virtual("unreadCount").get(function (this: any) {
  return this.recipients.filter((recipient: any) => !recipient.isRead).length;
});

// Method to mark notification as read for a specific user
NotificationSchema.methods.markAsRead = function (
  this: any,
  userId: mongoose.Types.ObjectId
) {
  const recipient = this.recipients.find(
    (r: any) => r.userId.toString() === userId.toString()
  );
  if (recipient && !recipient.isRead) {
    recipient.isRead = true;
    recipient.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to check if notification is read by a specific user
NotificationSchema.methods.isReadBy = function (
  this: any,
  userId: mongoose.Types.ObjectId
): boolean {
  const recipient = this.recipients.find(
    (r: any) => r.userId.toString() === userId.toString()
  );
  return recipient ? recipient.isRead : false;
};

// Static method to get notifications for a specific user
NotificationSchema.statics.getForUser = function (
  userId: mongoose.Types.ObjectId,
  options: {
    page?: number;
    limit?: number;
    type?: string;
    isRead?: boolean;
    priority?: string;
  } = {}
) {
  const { page = 1, limit = 20, type, isRead, priority } = options;

  const query: any = {
    "recipients.userId": userId,
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
  };

  if (type) query.type = type;
  if (priority) query.priority = priority;
  if (typeof isRead === "boolean") {
    query["recipients.isRead"] = isRead;
  }

  return this.find(query)
    .populate("sender", "name email avatar")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// Static method to get unread count for a user
NotificationSchema.statics.getUnreadCount = function (
  userId: mongoose.Types.ObjectId
) {
  return this.countDocuments({
    "recipients.userId": userId,
    "recipients.isRead": false,
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
  });
};

export default mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);
