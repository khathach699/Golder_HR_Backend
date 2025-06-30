import { Request, Response } from "express";
import { LeaveService } from "../services/leaveService";
import LeavePolicy from "../models/leavePolicy";
import {
  CreateSuccessResponse,
  CreateErrorResponse,
} from "../utils/responseHandler";

/**
 * @swagger
 * /api/leave/summary:
 *   get:
 *     summary: Get leave summary for authenticated employee
 *     tags: [Leave - Employee]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Leave summary retrieved successfully
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
 *                   example: "Leave summary retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/LeaveSummary'
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Internal server error
 */
export const getLeaveSummary = async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?._id;
    if (!employeeId) {
      return CreateErrorResponse(res, 401, "User not authenticated");
    }

    const summary = await LeaveService.getLeaveSummary(employeeId);
    return CreateSuccessResponse(
      res,
      200,
      "Leave summary retrieved successfully",
      summary
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to get leave summary"
    );
  }
};

/**
 * @swagger
 * /api/leave/history:
 *   get:
 *     summary: Get leave history for authenticated employee
 *     tags: [Leave - Employee]
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
 *           enum: [pending, approved, rejected, cancelled]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Leave history retrieved successfully
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
 *                   example: "Leave history retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LeaveRequest'
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Internal server error
 */
export const getLeaveHistory = async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?._id;
    if (!employeeId) {
      return CreateErrorResponse(res, 401, "User not authenticated");
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const history = await LeaveService.getLeaveHistory(
      employeeId,
      page,
      limit,
      status
    );
    return CreateSuccessResponse(
      res,
      200,
      "Leave history retrieved successfully",
      history
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to get leave history"
    );
  }
};

/**
 * @swagger
 * /api/leave/submit:
 *   post:
 *     summary: Gửi đơn xin nghỉ phép
 *     description: |
 *       **Chức năng:** Nhân viên gửi đơn xin nghỉ phép với đầy đủ thông tin và chọn người duyệt
 *
 *       **Nghiệp vụ:**
 *       - Nhân viên điền thông tin: loại nghỉ phép, ngày bắt đầu, ngày kết thúc, lý do
 *       - Chọn loại nghỉ phép: annual (phép năm), sick (ốm đau), personal (cá nhân), maternity (thai sản), unpaid (không lương)
 *       - **Chọn người duyệt đơn:** Có thể chọn manager, HR hoặc admin cụ thể để duyệt đơn
 *       - Hệ thống tự động tính số ngày nghỉ
 *       - Kiểm tra không được trùng lặp đơn trong cùng khoảng thời gian
 *       - Trạng thái mặc định: "pending" (chờ duyệt)
 *       - Gửi thông báo đến người được chọn để duyệt đơn
 *
 *       **Lưu ý:**
 *       - Ngày kết thúc phải sau hoặc bằng ngày bắt đầu
 *       - Không thể gửi đơn trùng thời gian với đơn đã có (pending/approved)
 *       - Nếu không chọn approver, đơn sẽ được gửi đến tất cả admin/HR
 *     tags: [Leave - Employee]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeaveRequestInput'
 *           examples:
 *             annual_leave:
 *               summary: Đơn nghỉ phép năm
 *               description: Nghỉ phép năm để du lịch, nghỉ ngơi
 *               value:
 *                 type: "annual"
 *                 startDate: "2026-01-20"
 *                 endDate: "2026-01-22"
 *                 reason: "Nghỉ phép năm để du lịch cùng gia đình"
 *                 approverId: "60d5ecb74b24a1234567890a"
 *             sick_leave:
 *               summary: Đơn nghỉ ốm
 *               description: Nghỉ ốm để điều trị bệnh
 *               value:
 *                 type: "sick"
 *                 startDate: "2026-01-15"
 *                 endDate: "2026-01-15"
 *                 reason: "Bị cảm cúm, cần nghỉ ngơi điều trị"
 *                 approverId: "60d5ecb74b24a1234567890b"
 *             personal_leave:
 *               summary: Đơn nghỉ việc cá nhân
 *               description: Nghỉ phép để giải quyết việc cá nhân
 *               value:
 *                 type: "personal"
 *                 startDate: "2026-01-25"
 *                 endDate: "2026-01-25"
 *                 reason: "Giải quyết thủ tục hành chính cá nhân"
 *                 approverId: "60d5ecb74b24a1234567890c"
 *     responses:
 *       201:
 *         description: Gửi đơn xin nghỉ phép thành công
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
 *                   example: "Leave request submitted successfully"
 *                 data:
 *                   $ref: '#/components/schemas/LeaveRequest'
 *       400:
 *         description: Thiếu thông tin bắt buộc hoặc dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       500:
 *         description: Lỗi hệ thống
 */
export const submitLeaveRequest = async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?._id;
    if (!employeeId) {
      return CreateErrorResponse(res, 401, "User not authenticated");
    }

    const { type, startDate, endDate, reason, approverId } = req.body;

    // Validate required fields
    if (!type || !startDate || !endDate || !reason) {
      return CreateErrorResponse(res, 400, "Missing required fields");
    }

    const requestData = {
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason.trim(),
      approverId: approverId || null,
    };

    const leaveRequest = await LeaveService.submitLeaveRequest(
      employeeId,
      requestData
    );
    return CreateSuccessResponse(
      res,
      201,
      "Leave request submitted successfully",
      leaveRequest
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to submit leave request"
    );
  }
};

export const updateLeaveRequest = async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?._id;
    if (!employeeId) {
      return CreateErrorResponse(res, 401, "User not authenticated");
    }

    const { requestId } = req.params;
    const { type, startDate, endDate, reason } = req.body;

    // Validate required fields
    if (!type || !startDate || !endDate || !reason) {
      return CreateErrorResponse(res, 400, "Missing required fields");
    }

    const requestData = {
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason.trim(),
    };

    const leaveRequest = await LeaveService.updateLeaveRequest(
      requestId,
      employeeId,
      requestData
    );
    return CreateSuccessResponse(
      res,
      200,
      "Leave request updated successfully",
      leaveRequest
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to update leave request"
    );
  }
};

export const cancelLeaveRequest = async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?._id;
    if (!employeeId) {
      return CreateErrorResponse(res, 401, "User not authenticated");
    }

    const { requestId } = req.params;
    const success = await LeaveService.cancelLeaveRequest(
      requestId,
      employeeId
    );

    if (!success) {
      return CreateErrorResponse(
        res,
        404,
        "Leave request not found or cannot be cancelled"
      );
    }

    return CreateSuccessResponse(
      res,
      200,
      "Leave request cancelled successfully",
      { success: true }
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to cancel leave request"
    );
  }
};

/**
 * @swagger
 * /api/leave/approvers:
 *   get:
 *     summary: Lấy danh sách người có thể duyệt đơn nghỉ phép
 *     description: |
 *       **Chức năng:** Lấy danh sách tất cả người có quyền duyệt đơn nghỉ phép
 *
 *       **Nghiệp vụ:**
 *       - Hiển thị danh sách manager, HR, admin có thể duyệt đơn
 *       - Nhân viên có thể chọn người cụ thể để gửi đơn đến
 *       - Chỉ hiển thị những người đang hoạt động (không bị disable/delete)
 *       - Thông tin bao gồm: tên, phòng ban, chức vụ, email, vai trò
 *
 *       **Vai trò có quyền duyệt:**
 *       - admin: Quản trị viên hệ thống
 *       - hr: Nhân sự
 *       - manager: Quản lý trực tiếp
 *     tags: [Leave - Employee]
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
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 *       500:
 *         description: Lỗi hệ thống
 */
export const getApprovers = async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?._id;
    if (!employeeId) {
      return CreateErrorResponse(res, 401, "User not authenticated");
    }

    const approvers = await LeaveService.getApprovers();
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
 * /api/leave/{requestId}:
 *   get:
 *     summary: Get leave request by ID
 *     tags: [Leave - Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave request ID
 *     responses:
 *       200:
 *         description: Leave request retrieved successfully
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
 *                   example: "Leave request retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/LeaveRequest'
 *       401:
 *         description: User not authenticated
 *       404:
 *         description: Leave request not found
 *       500:
 *         description: Internal server error
 */
export const getLeaveRequestById = async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?._id;
    if (!employeeId) {
      return CreateErrorResponse(res, 401, "User not authenticated");
    }

    const { requestId } = req.params;
    const leaveRequest = await LeaveService.getLeaveRequestById(
      requestId,
      employeeId
    );

    if (!leaveRequest) {
      return CreateErrorResponse(res, 404, "Leave request not found");
    }

    return CreateSuccessResponse(
      res,
      200,
      "Leave request retrieved successfully",
      leaveRequest
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to get leave request"
    );
  }
};

// Admin/HR endpoints

/**
 * @swagger
 * /api/leave/admin/{requestId}/approve:
 *   put:
 *     summary: Duyệt đơn xin nghỉ phép (Admin/HR)
 *     description: |
 *       **Chức năng:** Admin/HR duyệt đơn xin nghỉ phép của nhân viên
 *
 *       **Nghiệp vụ duyệt đơn:**
 *       - Chỉ admin, hr, manager mới có quyền duyệt đơn
 *       - Chỉ có thể duyệt đơn đang ở trạng thái "pending"
 *       - Sau khi duyệt, trạng thái chuyển thành "approved"
 *       - Lưu thông tin người duyệt và thời gian duyệt
 *       - Gửi thông báo đến nhân viên về việc đơn được duyệt
 *       - Đơn đã duyệt sẽ được tính vào số ngày nghỉ phép đã sử dụng
 *     tags: [Leave - Admin/HR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đơn xin nghỉ phép cần duyệt
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
 *                   example: "Leave request approved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/LeaveRequest'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền duyệt đơn
 *       404:
 *         description: Không tìm thấy đơn hoặc đơn đã được xử lý
 *       500:
 *         description: Lỗi hệ thống
 */
export const approveLeaveRequest = async (req: Request, res: Response) => {
  try {
    const approverId = req.user?._id;
    if (!approverId) {
      return CreateErrorResponse(res, 401, "User not authenticated");
    }

    // Check if user has admin/HR role
    const userRole = req.user?.role?.name;
    if (userRole !== "admin" && userRole !== "hr" && userRole !== "manager") {
      return CreateErrorResponse(res, 403, "Insufficient permissions");
    }

    const { requestId } = req.params;
    const leaveRequest = await LeaveService.approveLeaveRequest(
      requestId,
      approverId
    );

    return CreateSuccessResponse(
      res,
      200,
      "Leave request approved successfully",
      leaveRequest
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to approve leave request"
    );
  }
};

/**
 * @swagger
 * /api/leave/admin/{requestId}/reject:
 *   put:
 *     summary: Từ chối đơn xin nghỉ phép (Admin/HR)
 *     description: |
 *       **Chức năng:** Admin/HR từ chối đơn xin nghỉ phép với lý do cụ thể
 *
 *       **Nghiệp vụ từ chối đơn:**
 *       - Chỉ admin, hr, manager mới có quyền từ chối đơn
 *       - Chỉ có thể từ chối đơn đang ở trạng thái "pending"
 *       - **Bắt buộc phải có lý do từ chối** để nhân viên hiểu rõ
 *       - Sau khi từ chối, trạng thái chuyển thành "rejected"
 *       - Lưu thông tin người từ chối, thời gian và lý do từ chối
 *       - Gửi thông báo đến nhân viên kèm lý do từ chối
 *     tags: [Leave - Admin/HR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đơn xin nghỉ phép cần từ chối
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
 *                 example: "Thời gian nghỉ phép không phù hợp với lịch làm việc của dự án. Vui lòng chọn thời gian khác."
 *     responses:
 *       200:
 *         description: Từ chối đơn thành công
 *       400:
 *         description: Thiếu lý do từ chối
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền từ chối đơn
 *       404:
 *         description: Không tìm thấy đơn hoặc đơn đã được xử lý
 *       500:
 *         description: Lỗi hệ thống
 */
export const rejectLeaveRequest = async (req: Request, res: Response) => {
  try {
    const approverId = req.user?._id;
    if (!approverId) {
      return CreateErrorResponse(res, 401, "User not authenticated");
    }

    // Check if user has admin/HR role
    const userRole = req.user?.role?.name;
    if (userRole !== "admin" && userRole !== "hr" && userRole !== "manager") {
      return CreateErrorResponse(res, 403, "Insufficient permissions");
    }

    const { requestId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return CreateErrorResponse(res, 400, "Rejection reason is required");
    }

    const leaveRequest = await LeaveService.rejectLeaveRequest(
      requestId,
      approverId,
      rejectionReason.trim()
    );

    return CreateSuccessResponse(
      res,
      200,
      "Leave request rejected successfully",
      leaveRequest
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to reject leave request"
    );
  }
};

export const getAllLeaveRequests = async (req: Request, res: Response) => {
  try {
    // Authorization is already handled by middleware
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const result = await LeaveService.getAllLeaveRequests(page, limit, status);

    return CreateSuccessResponse(
      res,
      200,
      "All leave requests retrieved successfully",
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
      error.message || "Failed to get leave requests"
    );
  }
};

/**
 * @swagger
 * /api/leave/admin/init-policies:
 *   post:
 *     summary: Initialize default leave policies
 *     description: Initialize default leave policies for the system (Admin only)
 *     tags: [Leave Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Leave policies initialized successfully
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
export const initializeLeavePolicies = async (req: Request, res: Response) => {
  try {
    await LeaveService.initializeLeavePolicies();
    return CreateSuccessResponse(
      res,
      200,
      "Leave policies initialized successfully"
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to initialize leave policies"
    );
  }
};

/**
 * @swagger
 * /api/leave/policies:
 *   get:
 *     summary: Get all active leave policies
 *     description: Get all active leave policies with their rules and limits
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Leave policies retrieved successfully
 *       500:
 *         description: Server error
 */
export const getLeavePolicies = async (req: Request, res: Response) => {
  try {
    const policies = await LeavePolicy.find({ isActive: true }).sort({
      leaveType: 1,
    });
    return CreateSuccessResponse(
      res,
      200,
      "Leave policies retrieved successfully",
      policies
    );
  } catch (error: any) {
    return CreateErrorResponse(
      res,
      500,
      error.message || "Failed to get leave policies"
    );
  }
};
