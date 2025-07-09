import { body, query, param } from "express-validator";

// Validation cho tạo sự kiện mới
export const validateCreateEvent = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be between 1 and 200 characters"),

  body("description")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Description must not exceed 1000 characters"),

  body("startTime")
    .notEmpty()
    .withMessage("Start time is required")
    .isISO8601()
    .withMessage("Start time must be a valid ISO 8601 date"),

  body("endTime")
    .notEmpty()
    .withMessage("End time is required")
    .isISO8601()
    .withMessage("End time must be a valid ISO 8601 date")
    .custom((endTime, { req }) => {
      const startTime = req.body.startTime;
      if (startTime && new Date(endTime) <= new Date(startTime)) {
        throw new Error("End time must be after start time");
      }
      return true;
    }),

  body("isAllDay")
    .optional()
    .isBoolean()
    .withMessage("isAllDay must be a boolean"),

  body("type")
    .notEmpty()
    .withMessage("Event type is required")
    .isIn(["meeting", "leave", "holiday", "training", "event", "other"])
    .withMessage("Invalid event type"),

  body("color")
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage("Color must be a valid hex color code"),

  body("location")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Location must not exceed 200 characters"),

  body("attendees")
    .optional()
    .isArray()
    .withMessage("Attendees must be an array")
    .custom((attendees) => {
      if (attendees && attendees.length > 50) {
        throw new Error("Maximum 50 attendees allowed");
      }
      return true;
    }),

  body("attendees.*")
    .optional()
    .isMongoId()
    .withMessage("Each attendee must be a valid user ID"),

  body("isRecurring")
    .optional()
    .isBoolean()
    .withMessage("isRecurring must be a boolean"),

  body("recurrenceRule")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Recurrence rule must not exceed 500 characters"),
];

// Validation cho cập nhật sự kiện
export const validateUpdateEvent = [
  param("id")
    .isMongoId()
    .withMessage("Invalid event ID"),

  body("title")
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be between 1 and 200 characters"),

  body("description")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Description must not exceed 1000 characters"),

  body("startTime")
    .optional()
    .isISO8601()
    .withMessage("Start time must be a valid ISO 8601 date"),

  body("endTime")
    .optional()
    .isISO8601()
    .withMessage("End time must be a valid ISO 8601 date"),

  body("isAllDay")
    .optional()
    .isBoolean()
    .withMessage("isAllDay must be a boolean"),

  body("type")
    .optional()
    .isIn(["meeting", "leave", "holiday", "training", "event", "other"])
    .withMessage("Invalid event type"),

  body("color")
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage("Color must be a valid hex color code"),

  body("location")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Location must not exceed 200 characters"),

  body("attendees")
    .optional()
    .isArray()
    .withMessage("Attendees must be an array")
    .custom((attendees) => {
      if (attendees && attendees.length > 50) {
        throw new Error("Maximum 50 attendees allowed");
      }
      return true;
    }),

  body("attendees.*")
    .optional()
    .isMongoId()
    .withMessage("Each attendee must be a valid user ID"),

  body("isRecurring")
    .optional()
    .isBoolean()
    .withMessage("isRecurring must be a boolean"),

  body("recurrenceRule")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Recurrence rule must not exceed 500 characters"),

  body("isDeleted")
    .optional()
    .isBoolean()
    .withMessage("isDeleted must be a boolean"),
];

// Validation cho lấy danh sách sự kiện
export const validateGetEvents = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),

  query("type")
    .optional()
    .isIn(["meeting", "leave", "holiday", "training", "event", "other"])
    .withMessage("Invalid event type"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

// Validation cho lấy sự kiện theo ID
export const validateGetEventById = [
  param("id")
    .isMongoId()
    .withMessage("Invalid event ID"),
];

// Validation cho xóa sự kiện
export const validateDeleteEvent = [
  param("id")
    .isMongoId()
    .withMessage("Invalid event ID"),
];

// Validation cho lấy sự kiện theo tuần
export const validateGetWeeklyEvents = [
  query("weekStart")
    .notEmpty()
    .withMessage("Week start date is required")
    .isISO8601()
    .withMessage("Week start must be a valid ISO 8601 date"),
];

// Validation cho kiểm tra xung đột
export const validateCheckConflicts = [
  body("startTime")
    .notEmpty()
    .withMessage("Start time is required")
    .isISO8601()
    .withMessage("Start time must be a valid ISO 8601 date"),

  body("endTime")
    .notEmpty()
    .withMessage("End time is required")
    .isISO8601()
    .withMessage("End time must be a valid ISO 8601 date")
    .custom((endTime, { req }) => {
      const startTime = req.body.startTime;
      if (startTime && new Date(endTime) <= new Date(startTime)) {
        throw new Error("End time must be after start time");
      }
      return true;
    }),

  body("excludeEventId")
    .optional()
    .isMongoId()
    .withMessage("Exclude event ID must be a valid MongoDB ObjectId"),
];
