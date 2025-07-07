// Filename: IFCMToken.ts

import mongoose, { Document } from "mongoose";

export interface IFCMToken extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  token: string;
  deviceId?: string;
  deviceType: "android" | "ios" | "web";
  deviceInfo?: {
    model?: string;
    brand?: string;
    osVersion?: string;
    appVersion?: string;
  };
  isActive: boolean;
  lastUsed: Date;
  createdAt: Date;
  updatedAt: Date;
}
