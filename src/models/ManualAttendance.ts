import mongoose, { Document, Schema } from 'mongoose';

export interface IManualAttendance extends Document {
  userId: mongoose.Types.ObjectId;
  fullName: string;
  reason: string;
  failureImage?: string;
  deviceInfo: {
    deviceId: string; // Unique device identifier
    platform: string;
    model: string;
    brand?: string;
    version: string;
    manufacturer?: string;
    appVersion?: string;
    location?: {
      latitude: number;
      longitude: number;
      accuracy: number;
      timestamp: string;
      address?: string;
    };
  };
  isCheckIn: boolean;
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ManualAttendanceSchema: Schema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  failureImage: {
    type: String,
    default: null,
  },
  deviceInfo: {
    deviceId: { type: String, required: true }, // Unique device identifier
    platform: { type: String, required: true },
    model: { type: String, required: true },
    brand: { type: String },
    version: { type: String, required: true },
    manufacturer: { type: String },
    appVersion: { type: String },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
      timestamp: { type: String },
      address: { type: String },
    },
  },
  isCheckIn: {
    type: Boolean,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  adminNote: {
    type: String,
    trim: true,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
ManualAttendanceSchema.index({ userId: 1, timestamp: -1 });
ManualAttendanceSchema.index({ status: 1, createdAt: -1 });
ManualAttendanceSchema.index({ reviewedBy: 1, reviewedAt: -1 });

export default mongoose.model<IManualAttendance>('ManualAttendance', ManualAttendanceSchema);
