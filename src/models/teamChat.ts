import { Schema, model, Document } from "mongoose";

export interface ITeamChat extends Document {
  teamId: Schema.Types.ObjectId;
  senderId: Schema.Types.ObjectId;
  message: string;
  type: 'text' | 'file' | 'image' | 'system' | 'task_mention';
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>;
  mentions: Schema.Types.ObjectId[];
  replyTo?: Schema.Types.ObjectId;
  isPinned: boolean;
  isEdited: boolean;
  editedAt?: Date;
  reactions: Array<{
    userId: Schema.Types.ObjectId;
    emoji: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const teamChatSchema = new Schema<ITeamChat>(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: ['text', 'file', 'image', 'system', 'task_mention'],
      default: 'text',
    },
    attachments: [{
      fileName: { type: String, required: true },
      fileUrl: { type: String, required: true },
      fileType: { type: String, required: true },
      fileSize: { type: Number, required: true },
    }],
    mentions: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: "TeamChat",
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    reactions: [{
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      emoji: { type: String, required: true },
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
teamChatSchema.index({ teamId: 1, createdAt: -1 });
teamChatSchema.index({ senderId: 1 });
teamChatSchema.index({ mentions: 1 });
teamChatSchema.index({ isPinned: 1, teamId: 1 });

export const TeamChat = model<ITeamChat>("TeamChat", teamChatSchema);
