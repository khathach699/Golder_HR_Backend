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
const FCMTokenSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes for better performance
FCMTokenSchema.index({ userId: 1, isActive: 1 });
FCMTokenSchema.index({ token: 1 }, { unique: true });
FCMTokenSchema.index({ deviceId: 1 });
FCMTokenSchema.index({ lastUsed: 1 });
// Static method to get active tokens for a user
FCMTokenSchema.statics.getActiveTokensForUser = function (userId) {
    return this.find({
        userId,
        isActive: true,
    }).select("token deviceType deviceInfo");
};
// Static method to get active tokens for multiple users
FCMTokenSchema.statics.getActiveTokensForUsers = function (userIds) {
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
FCMTokenSchema.statics.cleanupOldTokens = async function (userId) {
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
            await this.updateMany({ _id: { $in: tokensToDeactivate.map((t) => t._id) } }, { isActive: false });
        }
    }
};
// Static method to register or update a token
FCMTokenSchema.statics.registerToken = async function (userId, token, deviceType, deviceId, deviceInfo) {
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
        }
        else {
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
            await this.cleanupOldTokens(userId);
            return newToken;
        }
    }
    catch (error) {
        console.error("Error registering FCM token:", error);
        throw error;
    }
};
exports.default = mongoose_1.default.model("FCMToken", FCMTokenSchema);
