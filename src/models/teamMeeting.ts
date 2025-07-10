import { Schema, model, Document } from "mongoose";

export interface ITeamMeeting extends Document {
  teamId: Schema.Types.ObjectId;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  meetingLink?: string;
  attendees: Array<{
    userId: Schema.Types.ObjectId;
    status: 'invited' | 'accepted' | 'declined' | 'tentative';
    responseAt?: Date;
  }>;
  documents: Array<{
    title: string;
    fileUrl: string;
    uploadedBy: Schema.Types.ObjectId;
    uploadedAt: Date;
  }>;
  notes?: string;
  createdBy: Schema.Types.ObjectId;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const teamMeetingSchema = new Schema<ITeamMeeting>(
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
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    attendees: [{
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      status: { 
        type: String, 
        enum: ['invited', 'accepted', 'declined', 'tentative'],
        default: 'invited'
      },
      responseAt: { type: Date },
    }],
    documents: [{
      title: { type: String, required: true },
      fileUrl: { type: String, required: true },
      uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      uploadedAt: { type: Date, default: Date.now },
    }],
    notes: {
      type: String,
      maxlength: 2000,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringPattern: {
      frequency: { 
        type: String, 
        enum: ['daily', 'weekly', 'monthly'],
      },
      interval: { type: Number, min: 1 },
      endDate: { type: Date },
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
teamMeetingSchema.index({ teamId: 1, startTime: 1 });
teamMeetingSchema.index({ createdBy: 1 });
teamMeetingSchema.index({ "attendees.userId": 1 });

export const TeamMeeting = model<ITeamMeeting>("TeamMeeting", teamMeetingSchema);
