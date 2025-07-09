import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { CreateErrorResponse } from "../utils/responseHandler";
import { CreateSuccessResponse } from "../utils/responseHandler";
import { CreateCalendarEventRequest } from "../types/calendar";
import * as CalendarService from "../services/calendarService";
import {
  CalendarQueryParams,
  UpdateCalendarEventRequest,
} from "../types/calendar";

/**
 * @swagger
 * /api/calendar:
 *   post:
 *     summary: Tạo một sự kiện lịch mới
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       description: Dữ liệu để tạo một sự kiện lịch mới.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCalendarEventRequest'
 *     responses:
 *       201:
 *         description: Sự kiện được tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Event created successfully"
 *                 event:
 *                   $ref: '#/components/schemas/CalendarEvent'
 *       400:
 *         description: Dữ liệu gửi lên không hợp lệ (Bad Request)
 *       401:
 *         description: Chưa xác thực (Unauthorized)
 *       500:
 *         description: Lỗi máy chủ (Internal Server Error)
 */
export const createEvent = async (req: Request, res: Response) => {
  try {
    // Kiểm tra validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return CreateErrorResponse(res, 400, "Validation failed", errors.array());
    }

    const userId = req.user?.id;
    if (!userId) {
      return CreateErrorResponse(res, 401, "Unauthorized");
    }

    const eventData: CreateCalendarEventRequest = req.body;
    const event = await CalendarService.createCalendarEvent(userId, eventData);

    return CreateSuccessResponse(res, 201, "Event created successfully", {
      event,
    });
  } catch (error: any) {
    return CreateErrorResponse(res, 400, error.message);
  }
};

/**
 * @swagger
 * /api/calendar:
 *   get:
 *     summary: Lấy danh sách sự kiện lịch (có filter và phân trang)
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       // ... (swagger parameters đã viết ở trên)
 *     responses:
 *       200:
 *         description: Lấy danh sách sự kiện thành công
 *       401:
 *         description: Chưa xác thực
 */
export const getEvents = async (req: Request, res: Response) => {
  try {
    // Kiểm tra validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return CreateErrorResponse(res, 400, "Validation failed", errors.array());
    }

    const userId = req.user?.id;
    if (!userId) {
      return CreateErrorResponse(res, 401, "Unauthorized");
    }

    const queryParams: CalendarQueryParams = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      type: req.query.type as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };

    const result = await CalendarService.getCalendarEvents(userId, queryParams);

    return CreateSuccessResponse(
      res,
      200,
      "Events retrieved successfully",
      result
    );
  } catch (error: any) {
    return CreateErrorResponse(res, 500, error.message);
  }
};

/**
 * @swagger
 * /api/calendar/{id}:
 *   get:
 *     summary: Lấy chi tiết một sự kiện theo ID
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của sự kiện
 *     responses:
 *       200:
 *         description: Lấy chi tiết sự kiện thành công
 *       404:
 *         description: Không tìm thấy sự kiện hoặc không có quyền xem
 */
export const getEventById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return CreateErrorResponse(res, 401, "Unauthorized");
    }

    const eventId = req.params.id;
    const event = await CalendarService.getCalendarEventById(eventId, userId);

    if (!event) {
      return CreateErrorResponse(
        res,
        404,
        "Event not found or you don't have access."
      );
    }

    return CreateSuccessResponse(
      res,
      200,
      "Event retrieved successfully",
      event
    );
  } catch (error: any) {
    return CreateErrorResponse(res, 500, error.message);
  }
};

/**
 * @swagger
 * /api/calendar/{id}:
 *   put:
 *     summary: Cập nhật một sự kiện
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của sự kiện cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCalendarEventRequest'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy sự kiện hoặc không có quyền sửa
 */
export const updateEvent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return CreateErrorResponse(res, 401, "Unauthorized");
    }

    const eventId = req.params.id;
    const updateData: UpdateCalendarEventRequest = req.body;

    const updatedEvent = await CalendarService.updateCalendarEvent(
      eventId,
      userId,
      updateData
    );

    return CreateSuccessResponse(
      res,
      200,
      "Event updated successfully",
      updatedEvent
    );
  } catch (error: any) {
    // Service sẽ throw lỗi 404 nếu không tìm thấy hoặc không có quyền
    return CreateErrorResponse(res, 404, error.message);
  }
};

/**
 * @swagger
 * /api/calendar/{id}:
 *   delete:
 *     summary: Xóa một sự kiện (soft-delete)
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của sự kiện cần xóa
 *     responses:
 *       200:
 *         description: Xóa sự kiện thành công
 *       404:
 *         description: Không tìm thấy sự kiện hoặc không có quyền xóa
 */
export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return CreateErrorResponse(res, 401, "Unauthorized");
    }

    const eventId = req.params.id;
    await CalendarService.deleteCalendarEvent(eventId, userId);

    return CreateSuccessResponse(res, 200, "Event deleted successfully", null);
  } catch (error: any) {
    return CreateErrorResponse(res, 404, error.message);
  }
};

/**
 * @swagger
 * /api/calendar/summary:
 *   get:
 *     summary: Lấy tóm tắt thống kê lịch của user
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thống kê thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Calendar summary retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/CalendarSummary'
 *       401:
 *         description: Chưa xác thực
 */
export const getCalendarSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return CreateErrorResponse(res, 401, "Unauthorized");
    }

    const summary = await CalendarService.getCalendarSummary(userId);

    return CreateSuccessResponse(
      res,
      200,
      "Calendar summary retrieved successfully",
      summary
    );
  } catch (error: any) {
    return CreateErrorResponse(res, 500, error.message);
  }
};

/**
 * @swagger
 * /api/calendar/weekly:
 *   get:
 *     summary: Lấy sự kiện theo tuần
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: weekStart
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu tuần (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lấy sự kiện tuần thành công
 *       400:
 *         description: Thiếu tham số weekStart
 *       401:
 *         description: Chưa xác thực
 */
export const getWeeklyEvents = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return CreateErrorResponse(res, 401, "Unauthorized");
    }

    const weekStartStr = req.query.weekStart as string;
    if (!weekStartStr) {
      return CreateErrorResponse(res, 400, "weekStart parameter is required");
    }

    const weekStart = new Date(weekStartStr);
    if (isNaN(weekStart.getTime())) {
      return CreateErrorResponse(res, 400, "Invalid weekStart date format");
    }

    const events = await CalendarService.getWeeklyEvents(userId, weekStart);

    return CreateSuccessResponse(
      res,
      200,
      "Weekly events retrieved successfully",
      { events }
    );
  } catch (error: any) {
    return CreateErrorResponse(res, 500, error.message);
  }
};

/**
 * @swagger
 * /api/calendar/conflicts:
 *   post:
 *     summary: Kiểm tra xung đột lịch
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startTime
 *               - endTime
 *             properties:
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               excludeEventId:
 *                 type: string
 *                 description: ID sự kiện cần loại trừ (dùng khi update)
 *     responses:
 *       200:
 *         description: Kiểm tra xung đột thành công
 *       400:
 *         description: Thiếu thông tin thời gian
 *       401:
 *         description: Chưa xác thực
 */
export const checkEventConflicts = async (req: Request, res: Response) => {
  try {
    // Kiểm tra validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return CreateErrorResponse(res, 400, "Validation failed", errors.array());
    }

    const userId = req.user?.id;
    if (!userId) {
      return CreateErrorResponse(res, 401, "Unauthorized");
    }

    const { startTime, endTime, excludeEventId } = req.body;

    const start = new Date(startTime);
    const end = new Date(endTime);

    const conflicts = await CalendarService.checkEventConflicts(
      userId,
      start,
      end,
      excludeEventId
    );

    return CreateSuccessResponse(
      res,
      200,
      "Conflict check completed",
      {
        hasConflicts: conflicts.length > 0,
        conflicts
      }
    );
  } catch (error: any) {
    return CreateErrorResponse(res, 500, error.message);
  }
};

/**
 * @swagger
 * /api/calendar/today:
 *   get:
 *     summary: Lấy sự kiện hôm nay
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy sự kiện hôm nay thành công
 *       401:
 *         description: Chưa xác thực
 */
export const getTodayEvents = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return CreateErrorResponse(res, 401, "Unauthorized");
    }

    const events = await CalendarService.getTodayEvents(userId);

    return CreateSuccessResponse(
      res,
      200,
      "Today events retrieved successfully",
      { events }
    );
  } catch (error: any) {
    return CreateErrorResponse(res, 500, error.message);
  }
};

/**
 * @swagger
 * /api/calendar/upcoming:
 *   get:
 *     summary: Lấy sự kiện sắp tới
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Số lượng sự kiện tối đa
 *     responses:
 *       200:
 *         description: Lấy sự kiện sắp tới thành công
 *       401:
 *         description: Chưa xác thực
 */
export const getUpcomingEvents = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return CreateErrorResponse(res, 401, "Unauthorized");
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;

    const events = await CalendarService.getUpcomingEvents(userId, limit);

    return CreateSuccessResponse(
      res,
      200,
      "Upcoming events retrieved successfully",
      { events }
    );
  } catch (error: any) {
    return CreateErrorResponse(res, 500, error.message);
  }
};
