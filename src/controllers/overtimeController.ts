import { Request, Response } from "express";
import { OvertimeService } from "../services/overtimeService";
import {
  CreateSuccessResponse,
  CreateErrorResponse,
} from "../utils/responseHandler";

/**
 * @swagger
 * /api/overtime/summary:
 *   get:
 *     summary: Get overtime summary for authenticated employee
 *     tags: [Overtime - Employee]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overtime summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Overtime summary retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/OvertimeSummary'
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Internal server error
 */
export const getOvertimeSummary = async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?._id;
    if (!employeeId) {
      return CreateErrorResponse(res, 401, "User not authenticated");
    }

    const summary = await OvertimeService.getOvertimeSummary(employeeId);
    return CreateSuccessResponse(
      res,
      200,
      "Overtime summary retrieved successfully",
      summary
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to get overtime summary"
    );
  }
};

/**
 * @swagger
 * /api/overtime/history:
 *   get:
 *     summary: Get overtime history for authenticated employee
 *     tags: [Overtime - Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Overtime history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Overtime history retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OvertimeRequest'
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Internal server error
 */
export const getOvertimeHistory = async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?._id;
    if (!employeeId) {
      return CreateErrorResponse(res, 401, "User not authenticated");
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const history = await OvertimeService.getOvertimeHistory(
      employeeId,
      page,
      limit,
      status
    );
    return CreateSuccessResponse(
      res,
      200,
      "Overtime history retrieved successfully",
      history
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to get overtime history"
    );
  }
};

/**
 * @swagger
 * /api/overtime/submit:
 *   post:
 *     summary: Gửi đơn xin làm thêm giờ
 *     description: |
 *       **Chức năng:** Nhân viên gửi đơn xin làm thêm giờ với đầy đủ thông tin và chọn người duyệt
 *
 *       **Nghiệp vụ:**
 *       - Nhân viên điền thông tin: ngày, giờ bắt đầu, giờ kết thúc, lý do làm thêm
 *       - Chọn loại overtime: regular (thường), weekend (cuối tuần), holiday (ngày lễ)
 *       - **Chọn người duyệt đơn:** Có thể chọn manager, HR hoặc admin cụ thể để duyệt đơn
 *       - Hệ thống tự động tính số giờ làm thêm
 *       - Kiểm tra không được trùng lặp đơn trong cùng ngày
 *       - Trạng thái mặc định: "pending" (chờ duyệt)
 *       - Gửi thông báo đến người được chọn để duyệt đơn
 *
 *       **Lưu ý:**
 *       - Giờ kết thúc phải sau giờ bắt đầu
 *       - Không thể gửi đơn trùng ngày với đơn đã có (pending/approved)
 *       - Nếu không chọn approver, đơn sẽ được gửi đến tất cả admin/HR
 *     tags: [Overtime - Employee]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OvertimeRequestInput'
 *           examples:
 *             regular_overtime:
 *               summary: Đơn làm thêm giờ thường
 *               description: Làm thêm giờ trong ngày thường sau giờ hành chính
 *               value:
 *                 date: "2026-01-15"
 *                 startTime: "2026-01-15T18:00:00Z"
 *                 endTime: "2026-01-15T22:00:00Z"
 *                 reason: "Hoàn thành dự án khẩn cấp cho khách hàng ABC"
 *                 type: "regular"
 *                 approverId: "60d5ecb74b24a1234567890a"
 *             weekend_overtime:
 *               summary: Đơn làm thêm cuối tuần
 *               description: Làm việc vào thứ 7, chủ nhật
 *               value:
 *                 date: "2026-01-20"
 *                 startTime: "2026-01-20T09:00:00Z"
 *                 endTime: "2026-01-20T17:00:00Z"
 *                 reason: "Bảo trì hệ thống không thể thực hiện trong giờ hành chính"
 *                 type: "weekend"
 *                 approverId: "60d5ecb74b24a1234567890b"
 *             holiday_overtime:
 *               summary: Đơn làm thêm ngày lễ
 *               description: Làm việc trong ngày lễ, tết
 *               value:
 *                 date: "2026-01-01"
 *                 startTime: "2026-01-01T08:00:00Z"
 *                 endTime: "2026-01-01T16:00:00Z"
 *                 reason: "Hỗ trợ khách hàng trong dịp tết nguyên đán"
 *                 type: "holiday"
 *                 approverId: "60d5ecb74b24a1234567890c"
 *     responses:
 *       201:
 *         description: Gửi đơn xin làm thêm giờ thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Overtime request submitted successfully"
 *                 data:
 *                   $ref: '#/components/schemas/OvertimeRequest'
 *             example:
 *               success: true
 *               message: "Overtime request submitted successfully"
 *               data:
 *                 _id: "60d5ecb74b24a1234567890d"
 *                 employeeId: "60d5ecb74b24a1234567890e"
 *                 employeeName: "Nguyễn Văn A"
 *                 date: "2026-01-15"
 *                 startTime: "2026-01-15T18:00:00Z"
 *                 endTime: "2026-01-15T22:00:00Z"
 *                 hours: 4
 *                 reason: "Hoàn thành dự án khẩn cấp"
 *                 type: "regular"
 *                 status: "pending"
 *                 assignedApproverId: "60d5ecb74b24a1234567890a"
 *                 createdAt: "2026-01-15T17:30:00Z"
 *       400:
 *         description: Thiếu thông tin bắt buộc hoặc dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Missing required fields"
 *             examples:
 *               missing_fields:
 *                 summary: Thiếu trường bắt buộc
 *                 value:
 *                   success: false
 *                   message: "Missing required fields"
 *               invalid_time:
 *                 summary: Thời gian không hợp lệ
 *                 value:
 *                   success: false
 *                   message: "End time must be after start time"
 *               duplicate_request:
 *                 summary: Trùng lặp đơn trong ngày
 *                 value:
 *                   success: false
 *                   message: "You already have an overtime request for this date"
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User not authenticated"
 *       500:
 *         description: Lỗi hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to submit overtime request"
 */
export const submitOvertimeRequest = async (req: Request, res: Response) => {
  try {
    console.log("🔍 [SUBMIT] submitOvertimeRequest called");
    console.log("🔍 [SUBMIT] Request body:", JSON.stringify(req.body, null, 2));

    const employeeId = req.user?._id;
    console.log("🔍 [SUBMIT] Employee ID:", employeeId);

    if (!employeeId) {
      console.log("❌ [SUBMIT] User not authenticated");
      return CreateErrorResponse(res, 401, "User not authenticated");
    }

    const { date, startTime, endTime, reason, type, approverId } = req.body;
    console.log("🔍 [SUBMIT] Extracted fields:", {
      date,
      startTime,
      endTime,
      reason,
      type,
      approverId,
    });

    // Validate required fields
    if (!date || !startTime || !endTime || !reason) {
      console.log("❌ [SUBMIT] Missing required fields");
      return CreateErrorResponse(res, 400, "Missing required fields");
    }

    const requestData = {
      date: new Date(date),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      reason: reason.trim(),
      type: type || "regular",
      approverId: approverId || null,
    };
    console.log(
      "🔍 [SUBMIT] Request data:",
      JSON.stringify(requestData, null, 2)
    );

    const overtimeRequest = await OvertimeService.submitOvertimeRequest(
      employeeId,
      requestData
    );
    console.log("✅ [SUBMIT] Overtime request submitted successfully");
    return CreateSuccessResponse(
      res,
      201,
      "Overtime request submitted successfully",
      overtimeRequest
    );
  } catch (error: any) {
    console.error("❌ [SUBMIT] Error:", error);
    console.error("❌ [SUBMIT] Error message:", error.message);
    console.error("❌ [SUBMIT] Error stack:", error.stack);
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to submit overtime request"
    );
  }
};

export const updateOvertimeRequest = async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?._id;
    if (!employeeId) {
      return CreateErrorResponse(res, 401, "User not authenticated");
    }

    const { requestId } = req.params;
    const { date, startTime, endTime, reason, type } = req.body;

    // Validate required fields
    if (!date || !startTime || !endTime || !reason) {
      return CreateErrorResponse(res, 400, "Missing required fields");
    }

    const requestData = {
      date: new Date(date),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      reason: reason.trim(),
      type: type || "regular",
    };

    const overtimeRequest = await OvertimeService.updateOvertimeRequest(
      requestId,
      employeeId,
      requestData
    );
    return CreateSuccessResponse(
      res,
      200,
      "Overtime request updated successfully",
      overtimeRequest
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to update overtime request"
    );
  }
};

export const cancelOvertimeRequest = async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?._id;
    if (!employeeId) {
      return CreateErrorResponse(res, 401, "User not authenticated");
    }

    const { requestId } = req.params;
    const success = await OvertimeService.cancelOvertimeRequest(
      requestId,
      employeeId
    );

    if (!success) {
      return CreateErrorResponse(
        res,
        404,
        "Overtime request not found or cannot be cancelled"
      );
    }

    return CreateSuccessResponse(
      res,
      200,
      "Overtime request cancelled successfully",
      { success: true }
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to cancel overtime request"
    );
  }
};

/**
 * @swagger
 * /api/overtime/approvers:
 *   get:
 *     summary: Lấy danh sách người có thể duyệt đơn làm thêm giờ
 *     description: |
 *       **Chức năng:** Lấy danh sách tất cả người có quyền duyệt đơn làm thêm giờ
 *
 *       **Nghiệp vụ:**
 *       - Hiển thị danh sách manager, HR, admin có thể duyệt đơn
 *       - Nhân viên có thể chọn người cụ thể để gửi đơn đến
 *       - Chỉ hiển thị những người đang hoạt động (không bị disable/delete)
 *       - Thông tin bao gồm: tên, phòng ban, chức vụ, email, vai trò
 *
 *       **Quy trình sử dụng:**
 *       1. Gọi API này để lấy danh sách approver
 *       2. Hiển thị dropdown/list cho nhân viên chọn
 *       3. Sử dụng _id của approver làm approverId khi submit đơn
 *       4. Nếu không chọn, đơn sẽ được gửi đến tất cả admin/HR
 *
 *       **Vai trò có quyền duyệt:**
 *       - admin: Quản trị viên hệ thống
 *       - hr: Nhân sự
 *       - manager: Quản lý trực tiếp
 *     tags: [Overtime - Employee]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách người duyệt thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Approvers retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Approver'
 *             example:
 *               success: true
 *               message: "Approvers retrieved successfully"
 *               data:
 *                 - _id: "60d5ecb74b24a1234567890a"
 *                   fullname: "Nguyễn Thị B"
 *                   department: "Human Resources"
 *                   position: "HR Manager"
 *                   email: "hr.manager@company.com"
 *                   role:
 *                     _id: "60d5ecb74b24a1234567890f"
 *                     name: "hr"
 *                 - _id: "60d5ecb74b24a1234567890b"
 *                   fullname: "Trần Văn C"
 *                   department: "IT Department"
 *                   position: "IT Manager"
 *                   email: "it.manager@company.com"
 *                   role:
 *                     _id: "60d5ecb74b24a1234567890g"
 *                     name: "manager"
 *                 - _id: "60d5ecb74b24a1234567890c"
 *                   fullname: "Lê Thị D"
 *                   department: "Administration"
 *                   position: "System Admin"
 *                   email: "admin@company.com"
 *                   role:
 *                     _id: "60d5ecb74b24a1234567890h"
 *                     name: "admin"
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User not authenticated"
 *       500:
 *         description: Lỗi hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to get approvers"
 */
export const getApprovers = async (req: Request, res: Response) => {
  try {
    console.log(`🔍 [CONTROLLER] getApprovers called`);
    console.log(`🔍 [CONTROLLER] req.user:`, req.user);
    const employeeId = req.user?._id;
    console.log(`🔍 [CONTROLLER] employeeId: ${employeeId}`);
    if (!employeeId) {
      console.log(`❌ [CONTROLLER] No employeeId found`);
      return CreateErrorResponse(res, 401, "User not authenticated");
    }

    const approvers = await OvertimeService.getApprovers();
    return CreateSuccessResponse(
      res,
      200,
      "Approvers retrieved successfully",
      approvers
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to get approvers"
    );
  }
};

/**
 * @swagger
 * /api/overtime/{requestId}:
 *   get:
 *     summary: Get overtime request by ID
 *     tags: [Overtime - Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Overtime request ID
 *     responses:
 *       200:
 *         description: Overtime request retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Overtime request retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/OvertimeRequest'
 *       401:
 *         description: User not authenticated
 *       404:
 *         description: Overtime request not found
 *       500:
 *         description: Internal server error
 */
export const getOvertimeRequestById = async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?._id;
    if (!employeeId) {
      return CreateErrorResponse(res, 401, "User not authenticated");
    }

    const { requestId } = req.params;
    const overtimeRequest = await OvertimeService.getOvertimeRequestById(
      requestId,
      employeeId
    );

    if (!overtimeRequest) {
      return CreateErrorResponse(res, 404, "Overtime request not found");
    }

    return CreateSuccessResponse(
      res,
      200,
      "Overtime request retrieved successfully",
      overtimeRequest
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to get overtime request"
    );
  }
};

// Admin/HR endpoints

/**
 * @swagger
 * /api/overtime/admin/{requestId}/approve:
 *   put:
 *     summary: Duyệt đơn xin làm thêm giờ (Admin/HR)
 *     description: |
 *       **Chức năng:** Admin/HR duyệt đơn xin làm thêm giờ của nhân viên
 *
 *       **Nghiệp vụ duyệt đơn:**
 *       - Chỉ admin, hr, manager mới có quyền duyệt đơn
 *       - Chỉ có thể duyệt đơn đang ở trạng thái "pending"
 *       - Sau khi duyệt, trạng thái chuyển thành "approved"
 *       - Lưu thông tin người duyệt và thời gian duyệt
 *       - Gửi thông báo đến nhân viên về việc đơn được duyệt
 *       - Đơn đã duyệt sẽ được tính vào lương overtime
 *
 *       **Quy trình nghiệp vụ:**
 *       1. Nhân viên gửi đơn → trạng thái "pending"
 *       2. Admin/HR xem danh sách đơn chờ duyệt
 *       3. Xem chi tiết đơn, kiểm tra lý do, thời gian
 *       4. Quyết định duyệt hoặc từ chối
 *       5. Nếu duyệt → trạng thái "approved", gửi thông báo
 *       6. Đơn được duyệt sẽ tính vào báo cáo overtime
 *
 *       **Lưu ý:**
 *       - Không thể duyệt đơn đã được xử lý (approved/rejected)
 *       - Người duyệt có thể khác với người được chỉ định ban đầu
 *       - Thời gian duyệt được ghi lại để audit
 *     tags: [Overtime - Admin/HR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đơn xin làm thêm giờ cần duyệt
 *         example: "60d5ecb74b24a1234567890a"
 *     responses:
 *       200:
 *         description: Duyệt đơn thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Overtime request approved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/OvertimeRequest'
 *             example:
 *               success: true
 *               message: "Overtime request approved successfully"
 *               data:
 *                 _id: "60d5ecb74b24a1234567890a"
 *                 employeeId: "60d5ecb74b24a1234567890b"
 *                 employeeName: "Nguyễn Văn A"
 *                 date: "2026-01-15"
 *                 startTime: "2026-01-15T18:00:00Z"
 *                 endTime: "2026-01-15T22:00:00Z"
 *                 hours: 4
 *                 reason: "Hoàn thành dự án khẩn cấp"
 *                 type: "regular"
 *                 status: "approved"
 *                 assignedApproverId: "60d5ecb74b24a1234567890c"
 *                 approvedBy: "60d5ecb74b24a1234567890d"
 *                 approvedAt: "2026-01-16T09:00:00Z"
 *                 createdAt: "2026-01-15T17:30:00Z"
 *                 updatedAt: "2026-01-16T09:00:00Z"
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User not authenticated"
 *       403:
 *         description: Không có quyền duyệt đơn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient permissions"
 *       404:
 *         description: Không tìm thấy đơn hoặc đơn đã được xử lý
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Overtime request not found or already processed"
 *       500:
 *         description: Lỗi hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to approve overtime request"
 */
export const approveOvertimeRequest = async (req: Request, res: Response) => {
  try {
    const approverId = req.user?._id;
    if (!approverId) {
      return CreateErrorResponse(res, 401, "User not authenticated");
    }

    // Check if user has admin/HR role
    const userRole = req.user?.role?.name;
    console.log(`🔍 [APPROVE] User role: ${userRole}`);
    if (userRole !== "admin" && userRole !== "hr" && userRole !== "manager") {
      console.log(`❌ [APPROVE] Access denied for role: ${userRole}`);
      return CreateErrorResponse(res, 403, "Insufficient permissions");
    }

    const { requestId } = req.params;
    const overtimeRequest = await OvertimeService.approveOvertimeRequest(
      requestId,
      approverId
    );

    return CreateSuccessResponse(
      res,
      200,
      "Overtime request approved successfully",
      overtimeRequest
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to approve overtime request"
    );
  }
};

/**
 * @swagger
 * /api/overtime/admin/{requestId}/reject:
 *   put:
 *     summary: Từ chối đơn xin làm thêm giờ (Admin/HR)
 *     description: |
 *       **Chức năng:** Admin/HR từ chối đơn xin làm thêm giờ với lý do cụ thể
 *
 *       **Nghiệp vụ từ chối đơn:**
 *       - Chỉ admin, hr, manager mới có quyền từ chối đơn
 *       - Chỉ có thể từ chối đơn đang ở trạng thái "pending"
 *       - **Bắt buộc phải có lý do từ chối** để nhân viên hiểu rõ
 *       - Sau khi từ chối, trạng thái chuyển thành "rejected"
 *       - Lưu thông tin người từ chối, thời gian và lý do từ chối
 *       - Gửi thông báo đến nhân viên kèm lý do từ chối
 *       - Đơn bị từ chối không được tính vào lương overtime
 *
 *       **Các lý do từ chối thường gặp:**
 *       - Không đủ căn cứ, lý do không hợp lý
 *       - Thời gian làm thêm không phù hợp với quy định
 *       - Công việc có thể hoàn thành trong giờ hành chính
 *       - Không có sự phê duyệt trước từ quản lý trực tiếp
 *       - Vi phạm quy định về giờ làm việc
 *       - Ngân sách overtime đã hết cho tháng/quý
 *
 *       **Quy trình nghiệp vụ:**
 *       1. Admin/HR xem chi tiết đơn xin làm thêm
 *       2. Đánh giá tính hợp lý của đơn
 *       3. Nếu không phù hợp → nhập lý do từ chối cụ thể
 *       4. Từ chối đơn → trạng thái "rejected"
 *       5. Hệ thống gửi thông báo kèm lý do đến nhân viên
 *       6. Nhân viên có thể gửi đơn mới sau khi khắc phục
 *     tags: [Overtime - Admin/HR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đơn xin làm thêm giờ cần từ chối
 *         example: "60d5ecb74b24a1234567890a"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejectionReason
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 description: Lý do từ chối đơn (bắt buộc)
 *                 minLength: 10
 *                 maxLength: 500
 *                 example: "Lý do làm thêm giờ không đủ thuyết phục. Công việc này có thể hoàn thành trong giờ hành chính thông qua việc sắp xếp công việc hợp lý hơn."
 *           examples:
 *             insufficient_reason:
 *               summary: Lý do không đủ thuyết phục
 *               value:
 *                 rejectionReason: "Lý do làm thêm giờ không đủ thuyết phục. Công việc này có thể hoàn thành trong giờ hành chính."
 *             budget_exceeded:
 *               summary: Vượt ngân sách overtime
 *               value:
 *                 rejectionReason: "Ngân sách overtime tháng này đã hết. Vui lòng sắp xếp công việc trong giờ hành chính hoặc chờ tháng sau."
 *             policy_violation:
 *               summary: Vi phạm quy định
 *               value:
 *                 rejectionReason: "Thời gian làm thêm vượt quá quy định tối đa 4 giờ/ngày. Vui lòng điều chỉnh thời gian phù hợp."
 *             no_approval:
 *               summary: Chưa có phê duyệt trước
 *               value:
 *                 rejectionReason: "Chưa có sự phê duyệt trước từ quản lý trực tiếp. Vui lòng xin phép trước khi làm thêm giờ."
 *     responses:
 *       200:
 *         description: Từ chối đơn thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Overtime request rejected successfully"
 *                 data:
 *                   $ref: '#/components/schemas/OvertimeRequest'
 *             example:
 *               success: true
 *               message: "Overtime request rejected successfully"
 *               data:
 *                 _id: "60d5ecb74b24a1234567890a"
 *                 employeeId: "60d5ecb74b24a1234567890b"
 *                 employeeName: "Nguyễn Văn A"
 *                 date: "2026-01-15"
 *                 startTime: "2026-01-15T18:00:00Z"
 *                 endTime: "2026-01-15T22:00:00Z"
 *                 hours: 4
 *                 reason: "Hoàn thành dự án khẩn cấp"
 *                 type: "regular"
 *                 status: "rejected"
 *                 assignedApproverId: "60d5ecb74b24a1234567890c"
 *                 approvedBy: "60d5ecb74b24a1234567890d"
 *                 approvedAt: "2026-01-16T09:00:00Z"
 *                 rejectionReason: "Lý do làm thêm giờ không đủ thuyết phục"
 *                 createdAt: "2026-01-15T17:30:00Z"
 *                 updatedAt: "2026-01-16T09:00:00Z"
 *       400:
 *         description: Thiếu lý do từ chối
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Rejection reason is required"
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User not authenticated"
 *       403:
 *         description: Không có quyền từ chối đơn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient permissions"
 *       404:
 *         description: Không tìm thấy đơn hoặc đơn đã được xử lý
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Overtime request not found or already processed"
 *       500:
 *         description: Lỗi hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to reject overtime request"
 */
export const rejectOvertimeRequest = async (req: Request, res: Response) => {
  try {
    const approverId = req.user?._id;
    if (!approverId) {
      return CreateErrorResponse(res, 401, "User not authenticated");
    }

    // Check if user has admin/HR role
    const userRole = req.user?.role?.name;
    console.log(`🔍 [REJECT] User role: ${userRole}`);
    if (userRole !== "admin" && userRole !== "hr" && userRole !== "manager") {
      console.log(`❌ [REJECT] Access denied for role: ${userRole}`);
      return CreateErrorResponse(res, 403, "Insufficient permissions");
    }

    const { requestId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return CreateErrorResponse(res, 400, "Rejection reason is required");
    }

    const overtimeRequest = await OvertimeService.rejectOvertimeRequest(
      requestId,
      approverId,
      rejectionReason.trim()
    );

    return CreateSuccessResponse(
      res,
      200,
      "Overtime request rejected successfully",
      overtimeRequest
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to reject overtime request"
    );
  }
};

export const getAllOvertimeRequests = async (req: Request, res: Response) => {
  try {
    console.log(`🔍 [CONTROLLER] getAllOvertimeRequests called`);
    console.log(`🔍 [CONTROLLER] User role:`, req.user?.role);
    console.log(`🔍 [CONTROLLER] Query params:`, req.query);

    // Authorization is already handled by middleware, no need to check again
    // The middleware check_authorization already verified the user has admin/hr/manager role

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    console.log(
      `🔍 [CONTROLLER] Calling service with page: ${page}, limit: ${limit}, status: ${status}`
    );

    const result = await OvertimeService.getAllOvertimeRequests(
      page,
      limit,
      status
    );

    return CreateSuccessResponse(
      res,
      200,
      "All overtime requests retrieved successfully",
      {
        requests: result.requests,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      }
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to get overtime requests"
    );
  }
};
