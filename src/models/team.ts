import { Schema, model, Document } from "mongoose";

export interface ITeam extends Document {
  name: string;
  description?: string;
  avatar?: string;
  leaderId: Schema.Types.ObjectId;
  departmentId?: Schema.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Virtual fields
  memberCount?: number;
  stats?: {
    totalMembers: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    completionRate: number;
  };
}

const teamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      unique: false, // Allow duplicate team names in different departments
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    avatar: {
      type: String,
      default: null,
    },
    leaderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index for unique team name per department
teamSchema.index({ name: 1, departmentId: 1 }, { unique: true });

// Other indexes for better performance
teamSchema.index({ leaderId: 1 });
teamSchema.index({ departmentId: 1 });
teamSchema.index({ isActive: 1 });
teamSchema.index({ createdAt: -1 });

export const Team = model<ITeam>("Team", teamSchema);
