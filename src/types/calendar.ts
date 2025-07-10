import { Document, Types } from "mongoose";

// Helper type để định nghĩa thông tin user sau khi được populate
// Giúp cho code an toàn hơn khi truy cập user.fullname, user.email, ...
export interface PopulatedUser {
  _id: Types.ObjectId;
  fullname: string;
  email: string;
  avatar?: string;
  department?: string;
  position?: string;
}

export interface CalendarEvent {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  type: "meeting" | "leave" | "holiday" | "training" | "event" | "other";
  color: string;
  location?: string;
  attendees: (Types.ObjectId | PopulatedUser)[];
  createdBy: Types.ObjectId | PopulatedUser;

  isRecurring: boolean;
  recurrenceRule?: string;
  isDeleted: boolean;
}

export interface CalendarDocument extends CalendarEvent, Document {}

// Dữ liệu client gửi lên để TẠO MỚI sự kiện
export interface CreateCalendarEventRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
  type: "meeting" | "leave" | "holiday" | "training" | "event" | "other";
  color?: string;
  location?: string;
  attendees?: string[]; // Mảng các ID của user
  isRecurring?: boolean;
  recurrenceRule?: string;
}

export interface UpdateCalendarEventRequest {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  type?: "meeting" | "leave" | "holiday" | "training" | "event" | "other";
  color?: string;
  location?: string;
  attendees?: string[];
  isRecurring?: boolean;
  recurrenceRule?: string;
  isDeleted?: boolean;
}

export interface CalendarQueryParams {
  startDate?: string;
  endDate?: string;
  type?: string;
  createdBy?: string;
  attendees?: string;
  page?: number;
  limit?: number;
}

export interface CalendarSummary {
  totalEvents: number;
  eventsByType: {
    meeting: number;
    leave: number;
    holiday: number;
    training: number;
    event: number;
    other: number;
  };
  upcomingEvents: number;
  todayEvents: number;
}
