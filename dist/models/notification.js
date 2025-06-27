"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const NotificationSchema = new mongoose_1.Schema({
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
                type: mongoose_1.default.Schema.Types.ObjectId,
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
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
    },
    data: {
        type: mongoose_1.default.Schema.Types.Mixed,
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
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes for better performance
NotificationSchema.index({ "recipients.userId": 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ priority: 1, createdAt: -1 });
NotificationSchema.index({ isActive: 1, createdAt: -1 });
NotificationSchema.index({ scheduledAt: 1 });
NotificationSchema.index({ expiresAt: 1 });
// Virtual for unread count per user
NotificationSchema.virtual("unreadCount").get(function () {
    return this.recipients.filter((recipient) => !recipient.isRead).length;
});
// Method to mark notification as read for a specific user
NotificationSchema.methods.markAsRead = function (userId) {
    const recipient = this.recipients.find((r) => r.userId.toString() === userId.toString());
    if (recipient && !recipient.isRead) {
        recipient.isRead = true;
        recipient.readAt = new Date();
        return this.save();
    }
    return Promise.resolve(this);
};
// Method to check if notification is read by a specific user
NotificationSchema.methods.isReadBy = function (userId) {
    const recipient = this.recipients.find((r) => r.userId.toString() === userId.toString());
    return recipient ? recipient.isRead : false;
};
// Static method to get notifications for a specific user
NotificationSchema.statics.getForUser = function (userId, options = {}) {
    const { page = 1, limit = 20, type, isRead, priority } = options;
    const query = {
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
    if (type)
        query.type = type;
    if (priority)
        query.priority = priority;
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
NotificationSchema.statics.getUnreadCount = function (userId) {
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
exports.default = mongoose_1.default.model("Notification", NotificationSchema);
