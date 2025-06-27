import mongoose, { Document, Schema } from "mongoose";

export interface IOvertimeRequest extends Document {
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  hours: number;
  reason: string;
  type: "regular" | "weekend" | "holiday";
  status: "pending" | "approved" | "rejected";
  assignedApproverId?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OvertimeRequestSchema: Schema = new Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    hours: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["regular", "weekend", "holiday"],
      default: "regular",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    assignedApproverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
OvertimeRequestSchema.index({ employeeId: 1, createdAt: -1 });
OvertimeRequestSchema.index({ status: 1, createdAt: -1 });
OvertimeRequestSchema.index({ date: 1 });

// Virtual for calculating hours automatically
OvertimeRequestSchema.pre("save", function (next) {
  if (this.startTime && this.endTime) {
    const startTime = this.startTime as Date;
    const endTime = this.endTime as Date;
    const diffMs = endTime.getTime() - startTime.getTime();
    this.hours = diffMs / (1000 * 60 * 60); // Convert to hours
  }
  next();
});

export default mongoose.model<IOvertimeRequest>(
  "OvertimeRequest",
  OvertimeRequestSchema
);
