import { Schema, model } from "mongoose";
import { CalendarDocument } from "../types/calendar";

const calendarEventSchema = new Schema<CalendarDocument>(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },

    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    isAllDay: { type: Boolean, default: false },

    type: {
      type: String,
      enum: ["meeting", "leave", "holiday", "training", "event", "other"],
      default: "event",
    },
    color: { type: String, default: "#2196F3" },
    location: { type: String },

    attendees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    isRecurring: { type: Boolean, default: false },
    recurrenceRule: { type: String },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

calendarEventSchema.index({ createdBy: 1, isDeleted: 1, startTime: 1 });
calendarEventSchema.index({ attendees: 1, isDeleted: 1, startTime: 1 });
calendarEventSchema.index({ type: 1, isDeleted: 1, startTime: 1 });

export default model<CalendarDocument>("Calendar", calendarEventSchema);
