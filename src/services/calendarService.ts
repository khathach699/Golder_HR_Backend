import CalendarModel from "../models/calendar";
import User from "../models/user";
import {
  CalendarDocument,
  CreateCalendarEventRequest,
  UpdateCalendarEventRequest,
  CalendarQueryParams,
  CalendarSummary,
} from "../types/calendar";
import { Types } from "mongoose";
import NotificationService from "./notificationService";

export const createCalendarEvent = async (
  userId: string,
  eventData: CreateCalendarEventRequest
): Promise<CalendarDocument> => {
  const startTime = new Date(eventData.startTime);
  const endTime = new Date(eventData.endTime);

  if (endTime <= startTime) {
    throw new Error("End time must be after start time");
  }

  // Check if start date is in the past (only compare dates, not time)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDateOnly = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());

  if (startDateOnly < today) {
    throw new Error("Cannot create event in the past");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (eventData.attendees && eventData.attendees.length > 0) {
    const attendees = await User.find({ _id: { $in: eventData.attendees } });
    if (attendees.length !== eventData.attendees.length) {
      throw new Error("Some attendees are invalid.");
    }
  }

  // Check for conflicts instead of exact duplicates
  const conflicts = await checkEventConflicts(userId, startTime, endTime);
  if (conflicts.length > 0) {
    throw new Error(`Time conflict detected with existing event: ${conflicts[0].title}`);
  }

  const calendarEvent = new CalendarModel({
    ...eventData,
    startTime,
    endTime,
    createdBy: userId,
  });

  const savedEvent = await calendarEvent.save();

  // Gửi notification cho attendees
  if (eventData.attendees && eventData.attendees.length > 0) {
    try {
      const notificationService = NotificationService.getInstance();
      await notificationService.createAndSendNotification({
        title: "New Calendar Event",
        message: `You have been invited to: ${eventData.title}`,
        type: "calendar",
        recipientIds: eventData.attendees,
        data: {
          eventId: (savedEvent._id as any).toString(),
          eventTitle: eventData.title,
          startTime: startTime.toISOString(),
        },
      });
    } catch (notificationError) {
      console.error("Failed to send calendar notification:", notificationError);
      // Không throw error để không ảnh hưởng đến việc tạo event
    }
  }

  return savedEvent;
};

export const getCalendarEvents = async (
  userId: string,
  queryParams: CalendarQueryParams
): Promise<{ events: CalendarDocument[]; total: number }> => {
  const { startDate, endDate, type, page = 1, limit = 20 } = queryParams;

  const filterConditions: any[] = [
    { isDeleted: false }, // Luôn lọc sự kiện chưa bị xóa
    {
      $or: [
        { createdBy: new Types.ObjectId(userId) },
        { attendees: new Types.ObjectId(userId) },
      ],
    }, // Điều kiện quyền hạn
  ];

  // Logic lọc khoảng thời gian GIAO NHAU (overlap)
  if (startDate) {
    filterConditions.push({ endTime: { $gte: new Date(startDate) } });
  }
  if (endDate) {
    filterConditions.push({ startTime: { $lte: new Date(endDate) } });
  }

  // Lọc theo loại sự kiện
  if (type) {
    filterConditions.push({ type });
  }

  const finalFilter = { $and: filterConditions };
  const skip = (page - 1) * limit;

  // Chạy song song 2 query để tối ưu hiệu năng
  const [events, total] = await Promise.all([
    CalendarModel.find(finalFilter)
      .populate("createdBy", "fullname email avatar department position")
      .populate("attendees", "fullname email avatar department position")
      .sort({ startTime: 1 }) // Sắp xếp theo thời gian bắt đầu
      .skip(skip)
      .limit(limit)
      .lean(),
    CalendarModel.countDocuments(finalFilter),
  ]);

  return { events: events as unknown as CalendarDocument[], total };
};

export const getCalendarEventById = async (
  eventId: string,
  userId: string
): Promise<CalendarDocument | null> => {
  const event = await CalendarModel.findOne({
    _id: eventId,
    isDeleted: false,
    $or: [
      { createdBy: new Types.ObjectId(userId) },
      { attendees: new Types.ObjectId(userId) },
    ],
  })
    .populate("createdBy", "fullname email avatar department position")
    .populate("attendees", "fullname email avatar department position");

  return event;
};

export const updateCalendarEvent = async (
  eventId: string,
  userId: string,
  updateData: UpdateCalendarEventRequest
): Promise<CalendarDocument | null> => {
  // Tìm sự kiện, chỉ người tạo mới có quyền sửa
  const event = await CalendarModel.findOne({
    _id: eventId,
    createdBy: userId,
    isDeleted: false,
  });

  if (!event) {
    throw new Error("Event not found or you don't have permission to edit.");
  }

  const newStartTime = updateData.startTime
    ? new Date(updateData.startTime)
    : event.startTime;
  const newEndTime = updateData.endTime
    ? new Date(updateData.endTime)
    : event.endTime;
  if (newEndTime < newStartTime) {
    throw new Error("End time cannot be earlier than start time.");
  }

  // Gán các giá trị mới
  Object.assign(event, updateData, {
    startTime: newStartTime,
    endTime: newEndTime,
  });

  return await event.save();
};

export const deleteCalendarEvent = async (
  eventId: string,
  userId: string
): Promise<boolean> => {
  // Tìm sự kiện, chỉ người tạo mới có quyền xóa
  const result = await CalendarModel.updateOne(
    {
      _id: eventId,
      createdBy: userId,
      isDeleted: false,
    },
    {
      $set: { isDeleted: true },
    }
  );

  if (result.modifiedCount === 0) {
    throw new Error("Event not found or you don't have permission to delete.");
  }

  return true;
};

export const getCalendarSummary = async (
  userId: string
): Promise<CalendarSummary> => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const userFilter = {
    isDeleted: false,
    $or: [
      { createdBy: new Types.ObjectId(userId) },
      { attendees: new Types.ObjectId(userId) },
    ],
  };

  // Tổng số sự kiện
  const totalEvents = await CalendarModel.countDocuments(userFilter);

  // Sự kiện theo loại
  const eventsByTypeAggregation = await CalendarModel.aggregate([
    { $match: userFilter },
    { $group: { _id: "$type", count: { $sum: 1 } } },
  ]);

  const eventsByType = {
    meeting: 0,
    leave: 0,
    holiday: 0,
    training: 0,
    event: 0,
    other: 0,
  };

  eventsByTypeAggregation.forEach((item) => {
    if (item._id in eventsByType) {
      eventsByType[item._id as keyof typeof eventsByType] = item.count;
    }
  });

  // Sự kiện sắp tới (từ hôm nay trở đi)
  const upcomingEvents = await CalendarModel.countDocuments({
    ...userFilter,
    startTime: { $gte: now },
  });

  // Sự kiện hôm nay
  const todayEvents = await CalendarModel.countDocuments({
    ...userFilter,
    startTime: { $gte: startOfToday, $lt: endOfToday },
  });

  return {
    totalEvents,
    eventsByType,
    upcomingEvents,
    todayEvents,
  };
};

// Thêm function để lấy sự kiện theo tuần
export const getWeeklyEvents = async (
  userId: string,
  weekStart: Date
): Promise<CalendarDocument[]> => {
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const events = await CalendarModel.find({
    isDeleted: false,
    $or: [
      { createdBy: new Types.ObjectId(userId) },
      { attendees: new Types.ObjectId(userId) },
    ],
    $and: [
      { endTime: { $gte: weekStart } },
      { startTime: { $lt: weekEnd } },
    ],
  })
    .populate("createdBy", "fullname email avatar department position")
    .populate("attendees", "fullname email avatar department position")
    .sort({ startTime: 1 })
    .lean();

  return events as unknown as CalendarDocument[];
};

// Thêm function để kiểm tra xung đột lịch
export const checkEventConflicts = async (
  userId: string,
  startTime: Date,
  endTime: Date,
  excludeEventId?: string
): Promise<CalendarDocument[]> => {
  const filter: any = {
    isDeleted: false,
    $or: [
      { createdBy: new Types.ObjectId(userId) },
      { attendees: new Types.ObjectId(userId) },
    ],
    $and: [
      { endTime: { $gt: startTime } },
      { startTime: { $lt: endTime } },
    ],
  };

  if (excludeEventId) {
    filter._id = { $ne: new Types.ObjectId(excludeEventId) };
  }

  const conflicts = await CalendarModel.find(filter)
    .populate("createdBy", "fullname email avatar department position")
    .populate("attendees", "fullname email avatar department position")
    .sort({ startTime: 1 })
    .lean();

  return conflicts as unknown as CalendarDocument[];
};

// Thêm function để tạo recurring events
export const createRecurringEvents = async (
  userId: string,
  eventData: CreateCalendarEventRequest,
  recurrencePattern: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number; // Mỗi bao nhiêu đơn vị (1 = mỗi ngày, 2 = mỗi 2 ngày)
    endDate?: Date;
    occurrences?: number; // Số lần lặp lại
  }
): Promise<CalendarDocument[]> => {
  const startTime = new Date(eventData.startTime);
  const endTime = new Date(eventData.endTime);
  const duration = endTime.getTime() - startTime.getTime();

  const events: CalendarDocument[] = [];
  let currentStart = new Date(startTime);
  let count = 0;
  const maxOccurrences = recurrencePattern.occurrences || 100; // Giới hạn tối đa

  while (count < maxOccurrences) {
    // Kiểm tra điều kiện dừng
    if (recurrencePattern.endDate && currentStart > recurrencePattern.endDate) {
      break;
    }

    const currentEnd = new Date(currentStart.getTime() + duration);

    // Kiểm tra xung đột cho từng event
    const conflicts = await checkEventConflicts(userId, currentStart, currentEnd);
    if (conflicts.length === 0) {
      const recurringEvent = new CalendarModel({
        ...eventData,
        startTime: currentStart,
        endTime: currentEnd,
        createdBy: userId,
        isRecurring: true,
        recurrenceRule: JSON.stringify(recurrencePattern),
      });

      const savedEvent = await recurringEvent.save();
      events.push(savedEvent);
    }

    // Tính toán thời gian cho event tiếp theo
    switch (recurrencePattern.frequency) {
      case 'daily':
        currentStart.setDate(currentStart.getDate() + recurrencePattern.interval);
        break;
      case 'weekly':
        currentStart.setDate(currentStart.getDate() + (7 * recurrencePattern.interval));
        break;
      case 'monthly':
        currentStart.setMonth(currentStart.getMonth() + recurrencePattern.interval);
        break;
      case 'yearly':
        currentStart.setFullYear(currentStart.getFullYear() + recurrencePattern.interval);
        break;
    }

    count++;
  }

  return events;
};

// Function để lấy events trong khoảng thời gian cụ thể (cho calendar view)
export const getEventsInDateRange = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarDocument[]> => {
  const events = await CalendarModel.find({
    isDeleted: false,
    $or: [
      { createdBy: new Types.ObjectId(userId) },
      { attendees: new Types.ObjectId(userId) },
    ],
    $and: [
      { endTime: { $gte: startDate } },
      { startTime: { $lte: endDate } },
    ],
  })
    .populate("createdBy", "fullname email avatar department position")
    .populate("attendees", "fullname email avatar department position")
    .sort({ startTime: 1 })
    .lean();

  return events as unknown as CalendarDocument[];
};

// Function để lấy events hôm nay
export const getTodayEvents = async (userId: string): Promise<CalendarDocument[]> => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  return getEventsInDateRange(userId, startOfToday, endOfToday);
};

// Function để lấy upcoming events
export const getUpcomingEvents = async (
  userId: string,
  limit: number = 5
): Promise<CalendarDocument[]> => {
  const now = new Date();

  const events = await CalendarModel.find({
    isDeleted: false,
    $or: [
      { createdBy: new Types.ObjectId(userId) },
      { attendees: new Types.ObjectId(userId) },
    ],
    startTime: { $gte: now },
  })
    .populate("createdBy", "fullname email avatar department position")
    .populate("attendees", "fullname email avatar department position")
    .sort({ startTime: 1 })
    .limit(limit)
    .lean();

  return events as unknown as CalendarDocument[];
};
