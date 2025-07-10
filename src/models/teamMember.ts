import { Schema, model, Document } from "mongoose";

export interface ITeamMember extends Document {
  teamId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  role: 'leader' | 'member' | 'viewer';
  joinedAt: Date;
  isActive: boolean;
}

const teamMemberSchema = new Schema<ITeamMember>(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ['leader', 'member', 'viewer'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
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

// Compound index to ensure unique user per team
teamMemberSchema.index({ teamId: 1, userId: 1 }, { unique: true });
teamMemberSchema.index({ userId: 1 });
teamMemberSchema.index({ teamId: 1, role: 1 });

export const TeamMember = model<ITeamMember>("TeamMember", teamMemberSchema);
