import { Schema, model, Document } from "mongoose";

export interface ITask extends Document {
  title: string;
  description?: string;
  assignedTo: Schema.Types.ObjectId;
  createdBy: Schema.Types.ObjectId;
  teamId?: Schema.Types.ObjectId; // Optional - tasks can exist without teams
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
  tags: string[];
  estimatedHours?: number;
  actualHours?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
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
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      default: null,
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
      message: { type: String, required: true, maxlength: 1000 },
      createdAt: { type: Date, default: Date.now },
    }],
    tags: [{
      type: String,
      trim: true,
      maxlength: 50,
    }],
    estimatedHours: {
      type: Number,
      min: 0,
      max: 1000,
    },
    actualHours: {
      type: Number,
      min: 0,
      max: 1000,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ teamId: 1, status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ status: 1, createdAt: -1 });
taskSchema.index({ tags: 1 });

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'done' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > this.dueDate;
});

// Virtual for due soon status (within 24 hours)
taskSchema.virtual('isDueSoon').get(function() {
  if (!this.dueDate || this.status === 'done' || this.status === 'cancelled') {
    return false;
  }
  const now = new Date();
  const timeDiff = this.dueDate.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 3600);
  return hoursDiff > 0 && hoursDiff <= 24;
});

// Pre-save middleware to set completedAt when status changes to done
taskSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'done' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'done') {
      this.completedAt = undefined;
    }
  }
  next();
});

export const Task = model<ITask>("Task", taskSchema);
