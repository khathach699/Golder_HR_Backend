import { Schema, model, Document } from "mongoose";

export interface ITeamDocument extends Document {
  teamId: Schema.Types.ObjectId;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: Schema.Types.ObjectId;
  permissions: Array<{
    userId: Schema.Types.ObjectId;
    permission: 'view' | 'edit' | 'admin';
  }>;
  tags: string[];
  version: number;
  isPublic: boolean;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const teamDocumentSchema = new Schema<ITeamDocument>(
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
      maxlength: 500,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    permissions: [{
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      permission: { 
        type: String, 
        enum: ['view', 'edit', 'admin'],
        default: 'view'
      },
    }],
    tags: [{
      type: String,
      trim: true,
      maxlength: 50,
    }],
    version: {
      type: Number,
      default: 1,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
teamDocumentSchema.index({ teamId: 1, createdAt: -1 });
teamDocumentSchema.index({ uploadedBy: 1 });
teamDocumentSchema.index({ tags: 1 });
teamDocumentSchema.index({ fileType: 1 });

export const TeamDocument = model<ITeamDocument>("TeamDocument", teamDocumentSchema);
