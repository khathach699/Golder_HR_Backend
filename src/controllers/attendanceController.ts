import { Request, Response } from "express";
import { CheckIn, CheckOut } from "../services/attendanceService";
import {
  CreateSuccessResponse,
  CreateErrorResponse,
} from "../utils/responseHandler";
import multer from "multer";
import User from "../models/user";
import { AUTH_ERRORS } from "../utils/constants";
import AttendanceModel from "../models/attendance";

const upload = multer({ storage: multer.memoryStorage() });
import * as AttendanceService from "../services/attendanceService";

/**
 * @swagger
 * /api/attendance/check-in:
 *   post:
 *     summary: Employee check-in with face verification
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Face image for verification
 *               location:
 *                 type: object
 *                 properties:
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *                     example: [106.6297, 10.8231]
 *                   address:
 *                     type: string
 *                     example: "123 Đường Láng, Hà Nội"
 *     responses:
 *       200:
 *         description: Check-in successful
 *       400:
 *         description: Bad request or face verification failed
 *       401:
 *         description: Unauthorized
 */
export const checkIn = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id; // Nên dùng optional chaining
    if (!userId) {
      return CreateErrorResponse(res, 401, "Unauthorized");
    }
    if (!req.file) {
      return CreateErrorResponse(res, 400, "No image file provided");
    }

    const { location: locationString } = req.body; // Lấy location dưới dạng chuỗi

    if (!locationString) {
      return CreateErrorResponse(res, 400, "Location data is required");
    }

    let locationData;
    try {
      // Parse toàn bộ chuỗi location
      locationData = JSON.parse(locationString);
    } catch (e) {
      // Nếu parse lỗi -> dữ liệu không hợp lệ
      return CreateErrorResponse(res, 400, "Invalid location JSON format");
    }

    // Bây giờ kiểm tra các thuộc tính bên trong đối tượng đã parse
    if (
      !locationData ||
      !locationData.coordinates ||
      !locationData.address ||
      !Array.isArray(locationData.coordinates)
    ) {
      return CreateErrorResponse(
        res,
        400,
        "Location must include coordinates (array) and address (string)"
      );
    }

    // Bây giờ bạn đã có locationData an toàn để sử dụng
    // locationData sẽ có dạng { coordinates: [106.6, 10.8], address: "..." }
    // Kiểu dữ liệu của coordinates đã là array, không cần parse lại

    const attendance = await CheckIn(userId, req.file.buffer, locationData);

    return CreateSuccessResponse(res, 200, { attendance });
  } catch (error: any) {
    // Bắt các lỗi từ CheckIn() service hoặc lỗi không lường trước
    return CreateErrorResponse(
      res,
      500,
      error.message || "An internal server error occurred"
    );
  }
};

/**
 * @swagger
 * /api/auth/check-out:
 *   post:
 *     summary: Employee check-out with face verification
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Face image for verification
 *               location:
 *                 type: string
 *                 description: "A JSON string representing the location object. Example: {\"coordinates\":[106.6297,10.8231],\"address\":\"123 Đường Láng, Hà Nội\"}"
 *                 example: '{"coordinates":[106.6297,10.8231],"address":"123 Đường Láng, Hà Nội"}'
 *     responses:
 *       200:
 *         description: Check-out successful
 *       400:
 *         description: Bad request or face verification failed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
export const checkOut = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    // Kiểm tra an toàn cho userId, mặc dù middleware đã làm
    if (!userId) {
      return CreateErrorResponse(
        res,
        401,
        "Unauthorized: User ID not found in token"
      );
    }

    // 1. Kiểm tra file ảnh
    if (!req.file) {
      return CreateErrorResponse(res, 400, "No image file provided");
    }

    // 2. Lấy chuỗi location từ req.body
    const { location: locationString } = req.body;
    if (!locationString || typeof locationString !== "string") {
      return CreateErrorResponse(
        res,
        400,
        "Location data is required as a JSON string"
      );
    }

    // 3. Phân tích chuỗi JSON an toàn
    let locationData;
    try {
      locationData = JSON.parse(locationString);
    } catch (e) {
      return CreateErrorResponse(res, 400, "Invalid location JSON format");
    }

    // 4. Kiểm tra cấu trúc của đối tượng location đã parse
    if (
      !locationData ||
      !locationData.coordinates ||
      !locationData.address ||
      !Array.isArray(locationData.coordinates)
    ) {
      return CreateErrorResponse(
        res,
        400,
        "Location must include coordinates (array) and address (string)"
      );
    }

    // 5. Gọi service với dữ liệu đã được xác thực
    const attendance = await CheckOut(userId, req.file.buffer, locationData);

    return CreateSuccessResponse(res, 200, { attendance });
  } catch (error: any) {
    // 6. Bắt tất cả các lỗi khác (từ service CheckOut hoặc lỗi không lường trước)
    // Trả về message của lỗi để debug nhưng trong production có thể che đi
    return CreateErrorResponse(
      res,
      500,
      error.message || "An internal server error occurred"
    );
  }
};
/**
 * @swagger
 * /api/attendance/users-dropdown:
 *   get:
 *     summary: Get list of active users for dropdown (Admin only)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "60c72b2f9b1e8b001c8f1234"
 *                       fullname:
 *                         type: string
 *                         example: "Nguyễn Văn A"
 *                       email:
 *                         type: string
 *                         example: "vana@example.com"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */

export const getUsersForDropdown = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ isdeleted: false, isdisable: false })
      .select("fullname email")
      .lean();
    return CreateSuccessResponse(
      res,
      200,
      users.map((user) => ({
        id: user._id.toString(),
        fullname: user.fullname,
        email: user.email,
      }))
    );
  } catch (error: any) {
    return CreateErrorResponse(res, 500, error.message);
  }
};

/**
 * @swagger
 * /api/attendance/upload-face/{userId}:
 *   post:
 *     summary: Upload employee's face image (Admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the employee selected from the dropdown
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Face image file
 *     responses:
 *       200:
 *         description: Face image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *       400:
 *         description: Bad request
 *       403:
 *         description: Unauthorized
 */
export const uploadEmployeeFace = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!req.file) {
      return CreateErrorResponse(res, 400, "No image file provided");
    }
    const user = await User.findById(userId);
    if (!user || user.isdeleted || user.isdisable) {
      return CreateErrorResponse(res, 400, AUTH_ERRORS.USER_NOT_FOUND);
    }
    const imageUrl = await AttendanceService.UploadEmployeeFace(
      userId,
      req.file.buffer
    );
    return CreateSuccessResponse(res, 200, {
      imageUrl,
      user: { id: user._id, fullname: user.fullname, email: user.email },
    });
  } catch (error: any) {
    return CreateErrorResponse(res, 400, error.message);
  }
};

/**
 * @swagger
 * /api/attendance/check-status:
 *   get:
 *     summary: Check if user has checked in/out today
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Check status successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasCheckedIn:
 *                       type: boolean
 *                     hasCheckedOut:
 *                       type: boolean
 *                     checkInTime:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     checkOutTime:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
export const checkAttendanceStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return CreateErrorResponse(res, 401, "Unauthorized");
    }

    const workDate = new Date().toISOString().split("T")[0];
    const attendance = await AttendanceModel.findOne({
      employeeId: userId,
      workDate,
    });

    const hasCheckedIn = !!attendance?.checkIn;
    const hasCheckedOut = !!attendance?.checkOut;
    const checkInTime = attendance?.checkIn?.time || null;
    const checkOutTime = attendance?.checkOut?.time || null;

    return CreateSuccessResponse(res, 200, {
      hasCheckedIn,
      hasCheckedOut,
      checkInTime,
      checkOutTime,
    });
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "An internal server error occurred"
    );
  }
};

// attendanceController.ts

/**
 * @swagger
 * /api/attendance/today-summary:
 *   get:
 *     summary: Get a comprehensive summary of today's attendance for the logged-in user.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's summary retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isCheckedIn:
 *                       type: boolean
 *                     isCheckedOut:
 *                       type: boolean
 *                     checkInTime:
 *                       type: string
 *                       example: "08:55 AM"
 *                     checkOutTime:
 *                       type: string
 *                       example: "--:-- --"
 *                     totalHours:
 *                       type: string
 *                       example: "2h 37m"
 *                     overtime:
 *                       type: string
 *                       example: "0h 0m"
 */
export const getTodaySummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return CreateErrorResponse(res, 401, "Unauthorized");
    }

    const summary = await AttendanceService.updateAttendanceStatus(userId);
    const isCheckedIn = summary.checkInTime !== null;

    // isCheckedOut được xác định bởi checkOutTime có phải là giá trị mặc định hay không
    const isCheckedOut = summary.checkOutTime !== "--:-- --";

    const responseData = {
      isCheckedIn,
      isCheckedOut,
      ...summary,
    };

    return CreateSuccessResponse(res, 200, responseData);
  } catch (error: any) {
    return CreateErrorResponse(res, 500, error.message);
  }
};

/**
 * @swagger
 * /api/attendance/summary/week:
 *   get:
 *     summary: Get weekly attendance summary for the current user
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Weekly summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workDays:
 *                   type: string
 *                   example: "4 / 5"
 *                 totalHours:
 *                   type: string
 *                   example: "32h 15m"
 *                 overtime:
 *                   type: string
 *                   example: "2h 30m"
 *                 lateArrivals:
 *                   type: number
 *                   example: 1
 *                 performance:
 *                   type: number
 *                   example: 0.8
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
export const getWeekSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return CreateErrorResponse(res, 401, "Unauthorized");
    }
    const summary = await AttendanceService.getWeekSummary(userId);
    return CreateSuccessResponse(res, 200, summary);
  } catch (error: any) {
    return CreateErrorResponse(res, 500, error.message);
  }
};

/**
 * @swagger
 * /api/attendance/summary/month:
 *   get:
 *     summary: Get monthly attendance summary for the current user
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workDays:
 *                   type: string
 *                   example: "18 / 22"
 *                 totalHours:
 *                   type: string
 *                   example: "144h 45m"
 *                 overtime:
 *                   type: string
 *                   example: "8h 15m"
 *                 daysOff:
 *                   type: number
 *                   example: 2
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
export const getMonthSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return CreateErrorResponse(res, 401, "Unauthorized");
    }
    const summary = await AttendanceService.getMonthSummary(userId);
    return CreateSuccessResponse(res, 200, summary);
  } catch (error: any) {
    return CreateErrorResponse(res, 500, error.message);
  }
};

/**
 * @swagger
 * /api/attendance/history:
 *   get:
 *     summary: Get paginated attendance history for the current user
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: The page number to retrieve.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: The number of records to retrieve per page.
 *     responses:
 *       200:
 *         description: A list of attendance records with pagination info.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "60d0fe4f5311236168a109ca"
 *                       date:
 *                         type: string
 *                         example: "June 24"
 *                       checkIn:
 *                         type: string
 *                         example: "09:00 AM"
 *                       checkOut:
 *                         type: string
 *                         example: "05:00 PM"
 *                       totalHours:
 *                         type: string
 *                         example: "8h 0m"
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 totalPages:
 *                   type: integer
 *                   example: 5
 *                 totalRecords:
 *                   type: integer
 *                   example: 48
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
export const getHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return CreateErrorResponse(res, 401, "Unauthorized");
    }

    // Lấy page và limit từ query params, chuyển về dạng số và đặt giá trị mặc định
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const data = await AttendanceService.getAttendanceHistory(
      userId,
      page,
      limit
    );

    return CreateSuccessResponse(res, 200, data);
  } catch (error: any) {
    return CreateErrorResponse(res, 500, error.message);
  }
};

/**
 * @swagger
 * /api/attendance/monthly-details:
 *   get:
 *     summary: Get full attendance details and summary for a specific month
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema: { type: integer, example: 2025 }
 *         description: The year to retrieve data for.
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: integer, example: 6 }
 *         description: The month to retrieve data for (1-12).
 *     responses:
 *       200:
 *         description: Monthly details and summary retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dailyDetails:
 *                   type: array
 *                   items:
 *                      type: object
 *                      properties:
 *                          date:
 *                            type: string
 *                            format: date-time
 *                          status:
 *                            type: string
 *                            enum: [On Time, Late, Absent, Weekend, On Leave, Holiday]
 *                          checkIn:
 *                            type: string
 *                          checkOut:
 *                            type: string
 *                          totalHours:
 *                            type: string
 *                          overtime:
 *                            type: string
 *                 summary:
 *                   type: object
 *                   properties:
 *                       workDays: { type: number }
 *                       lateArrivals: { type: number }
 *                       absences: { type: number }
 *                       holidays: { type: number }
 */
export const getMonthlyDetails = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return CreateErrorResponse(res, 401, "Unauthorized");
    }

    const year = parseInt(req.query.year as string);
    const month = parseInt(req.query.month as string);

    if (!year || !month || month < 1 || month > 12) {
      return CreateErrorResponse(
        res,
        400,
        "Valid 'year' and 'month' (1-12) are required."
      );
    }

    const data = await AttendanceService.getMonthlyDetails(userId, year, month);

    return CreateSuccessResponse(res, 200, data);
  } catch (error: any) {
    return CreateErrorResponse(res, 500, error.message);
  }
};
