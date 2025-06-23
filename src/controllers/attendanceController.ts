import { Request, Response } from "express";
import { CheckIn, CheckOut } from "../services/attendanceService";
import {
  CreateSuccessResponse,
  CreateErrorResponse,
} from "../utils/responseHandler";
import multer from "multer";
import User from "../models/user";
import { AUTH_ERRORS } from "../utils/constants";

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
