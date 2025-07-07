// Filename: fcmToken.model.ts

import mongoose, { Schema } from "mongoose";
import { IFCMToken } from "../types/IFCMToken";

const FCMTokenSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    deviceId: {
      type: String,
      trim: true,
    },
    deviceType: {
      type: String,
      enum: ["android", "ios", "web"],
      required: true,
    },
    deviceInfo: {
      model: String,
      brand: String,
      osVersion: String,
      appVersion: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
FCMTokenSchema.index({ userId: 1, isActive: 1 });
FCMTokenSchema.index({ deviceId: 1 });
FCMTokenSchema.index({ lastUsed: 1 });

// Static method to get active tokens for a user
FCMTokenSchema.statics.getActiveTokensForUser = function (
  userId: mongoose.Types.ObjectId
) {
  return this.find({
    userId,
    isActive: true,
  }).select("token deviceType deviceInfo");
};

// Static method to get active tokens for multiple users
FCMTokenSchema.statics.getActiveTokensForUsers = function (
  userIds: mongoose.Types.ObjectId[]
) {
  return this.find({
    userId: { $in: userIds },
    isActive: true,
  }).select("token userId deviceType deviceInfo");
};

// Method to update last used timestamp
FCMTokenSchema.methods.updateLastUsed = function () {
  this.lastUsed = new Date();
  return this.save();
};

// Static method to deactivate old tokens for a user (keep only the latest 3 per device type)
FCMTokenSchema.statics.cleanupOldTokens = async function (
  userId: mongoose.Types.ObjectId
) {
  const deviceTypes = ["android", "ios", "web"];

  for (const deviceType of deviceTypes) {
    const tokens = await this.find({
      userId,
      deviceType,
      isActive: true,
    }).sort({ lastUsed: -1 });

    // Keep only the latest 3 tokens per device type
    if (tokens.length > 3) {
      const tokensToDeactivate = tokens.slice(3);
      await this.updateMany(
        { _id: { $in: tokensToDeactivate.map((t: any) => t._id) } },
        { isActive: false }
      );
    }
  }
};

// Static method to register or update a token
FCMTokenSchema.statics.registerToken = async function (
  userId: mongoose.Types.ObjectId,
  token: string,
  deviceType: "android" | "ios" | "web",
  deviceId?: string,
  deviceInfo?: any
) {
  try {
    // Try to find existing token
    let existingToken = await this.findOne({ token });

    if (existingToken) {
      // Update existing token
      existingToken.userId = userId;
      existingToken.deviceType = deviceType;
      existingToken.deviceId = deviceId;
      existingToken.deviceInfo = deviceInfo;
      existingToken.isActive = true;
      existingToken.lastUsed = new Date();
      await existingToken.save();
      return existingToken;
    } else {
      // Create new token
      const newToken = new this({
        userId,
        token,
        deviceType,
        deviceId,
        deviceInfo,
        isActive: true,
        lastUsed: new Date(),
      });
      await newToken.save();

      // Cleanup old tokens for this user
      await (this as any).cleanupOldTokens(userId);

      return newToken;
    }
  } catch (error) {
    console.error("Error registering FCM token:", error);
    throw error;
  }
};

export default mongoose.model<IFCMToken>("FCMToken", FCMTokenSchema);
