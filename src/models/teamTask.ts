import { Schema, model, Document } from "mongoose";

export interface ITeamTask extends Document {
  teamId: Schema.Types.ObjectId;
  title: string;
  description?: string;
  assignedTo: Schema.Types.ObjectId;
  createdBy: Schema.Types.ObjectId;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    uploadedAt: Date;
  }>;
  comments: Array<{
    userId: Schema.Types.ObjectId;
    message: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const teamTaskSchema = new Schema<ITeamTask>(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'review', 'done', 'cancelled'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    attachments: [{
      fileName: { type: String, required: true },
      fileUrl: { type: String, required: true },
      fileType: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
    }],
    comments: [{
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      message: { type: String, required: true, maxlength: 500 },
      createdAt: { type: Date, default: Date.now },
    }],
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
teamTaskSchema.index({ teamId: 1, status: 1 });
teamTaskSchema.index({ assignedTo: 1, status: 1 });
teamTaskSchema.index({ createdBy: 1 });
teamTaskSchema.index({ dueDate: 1 });

export const TeamTask = model<ITeamTask>("TeamTask", teamTaskSchema);
