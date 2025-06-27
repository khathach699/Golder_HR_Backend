import OvertimeRequest, { IOvertimeRequest } from "../models/overtime";
import User from "../models/user";
import Role from "../models/role";
import NotificationService from "./notificationService";

export interface OvertimeSummary {
  thisMonthHours: number;
  thisWeekHours: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalHoursThisYear: number;
}

export interface OvertimeRequestData {
  date: Date;
  startTime: Date;
  endTime: Date;
  reason: string;
  type: "regular" | "weekend" | "holiday";
  approverId?: string;
}

export class OvertimeService {
  static async getOvertimeSummary(
    employeeId: string
  ): Promise<OvertimeSummary> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get this month's hours
    const thisMonthRequests = await OvertimeRequest.find({
      employeeId,
      status: "approved",
      date: { $gte: startOfMonth },
    });
    const thisMonthHours = thisMonthRequests.reduce(
      (sum, req) => sum + req.hours,
      0
    );

    // Get this week's hours
    const thisWeekRequests = await OvertimeRequest.find({
      employeeId,
      status: "approved",
      date: { $gte: startOfWeek },
    });
    const thisWeekHours = thisWeekRequests.reduce(
      (sum, req) => sum + req.hours,
      0
    );

    // Get request counts
    const [pendingRequests, approvedRequests, rejectedRequests] =
      await Promise.all([
        OvertimeRequest.countDocuments({ employeeId, status: "pending" }),
        OvertimeRequest.countDocuments({ employeeId, status: "approved" }),
        OvertimeRequest.countDocuments({ employeeId, status: "rejected" }),
      ]);

    // Get total hours this year
    const thisYearRequests = await OvertimeRequest.find({
      employeeId,
      status: "approved",
      date: { $gte: startOfYear },
    });
    const totalHoursThisYear = thisYearRequests.reduce(
      (sum, req) => sum + req.hours,
      0
    );

    return {
      thisMonthHours,
      thisWeekHours,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      totalHoursThisYear,
    };
  }

  static async getOvertimeHistory(
    employeeId: string,
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<IOvertimeRequest[]> {
    const query: any = { employeeId };

    if (status && ["pending", "approved", "rejected"].includes(status)) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    return await OvertimeRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("approvedBy", "name")
      .exec();
  }

  static async submitOvertimeRequest(
    employeeId: string,
    requestData: OvertimeRequestData
  ): Promise<IOvertimeRequest> {
    // Get employee info
    const employee = await User.findById(employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    // Validate dates
    if (requestData.endTime <= requestData.startTime) {
      throw new Error("End time must be after start time");
    }

    // Check for overlapping requests on the same date
    const existingRequest = await OvertimeRequest.findOne({
      employeeId,
      date: {
        $gte: new Date(
          requestData.date.getFullYear(),
          requestData.date.getMonth(),
          requestData.date.getDate()
        ),
        $lt: new Date(
          requestData.date.getFullYear(),
          requestData.date.getMonth(),
          requestData.date.getDate() + 1
        ),
      },
      status: { $in: ["pending", "approved"] },
    });

    if (existingRequest) {
      throw new Error("You already have an overtime request for this date");
    }

    // Calculate hours
    const diffMs =
      requestData.endTime.getTime() - requestData.startTime.getTime();
    const hours = diffMs / (1000 * 60 * 60);

    // Create overtime request
    const overtimeRequest = new OvertimeRequest({
      employeeId,
      employeeName: employee.fullname,
      date: requestData.date,
      startTime: requestData.startTime,
      endTime: requestData.endTime,
      hours,
      reason: requestData.reason,
      type: requestData.type,
      status: "pending",
      assignedApproverId: requestData.approverId || null,
    });

    const savedRequest = await overtimeRequest.save();

    // Send notification to HR/managers
    // TODO: Implement overtime notification methods
    // await NotificationService.getInstance().sendOvertimeRequestNotification(savedRequest);

    return savedRequest;
  }

  static async updateOvertimeRequest(
    requestId: string,
    employeeId: string,
    requestData: OvertimeRequestData
  ): Promise<IOvertimeRequest> {
    const overtimeRequest = await OvertimeRequest.findOne({
      _id: requestId,
      employeeId,
      status: "pending", // Only pending requests can be updated
    });

    if (!overtimeRequest) {
      throw new Error("Overtime request not found or cannot be updated");
    }

    // Validate dates
    if (requestData.endTime <= requestData.startTime) {
      throw new Error("End time must be after start time");
    }

    // Calculate hours
    const diffMs =
      requestData.endTime.getTime() - requestData.startTime.getTime();
    const hours = diffMs / (1000 * 60 * 60);

    // Update request
    overtimeRequest.date = requestData.date;
    overtimeRequest.startTime = requestData.startTime;
    overtimeRequest.endTime = requestData.endTime;
    overtimeRequest.hours = hours;
    overtimeRequest.reason = requestData.reason;
    overtimeRequest.type = requestData.type;

    return await overtimeRequest.save();
  }

  static async cancelOvertimeRequest(
    requestId: string,
    employeeId: string
  ): Promise<boolean> {
    const result = await OvertimeRequest.deleteOne({
      _id: requestId,
      employeeId,
      status: "pending", // Only pending requests can be cancelled
    });

    return result.deletedCount > 0;
  }

  static async getOvertimeRequestById(
    requestId: string,
    employeeId: string
  ): Promise<IOvertimeRequest | null> {
    return await OvertimeRequest.findOne({
      _id: requestId,
      employeeId,
    }).populate("approvedBy", "name");
  }

  // Admin/HR methods
  static async approveOvertimeRequest(
    requestId: string,
    approverId: string
  ): Promise<IOvertimeRequest> {
    const overtimeRequest = await OvertimeRequest.findOne({
      _id: requestId,
      status: "pending",
    });

    if (!overtimeRequest) {
      throw new Error("Overtime request not found or already processed");
    }

    overtimeRequest.status = "approved";
    overtimeRequest.approvedBy = approverId as any;
    overtimeRequest.approvedAt = new Date();

    const savedRequest = await overtimeRequest.save();

    // Send notification to employee
    // TODO: Implement overtime notification methods
    // await NotificationService.getInstance().sendOvertimeApprovalNotification(savedRequest, true);

    return savedRequest;
  }

  static async rejectOvertimeRequest(
    requestId: string,
    approverId: string,
    rejectionReason: string
  ): Promise<IOvertimeRequest> {
    const overtimeRequest = await OvertimeRequest.findOne({
      _id: requestId,
      status: "pending",
    });

    if (!overtimeRequest) {
      throw new Error("Overtime request not found or already processed");
    }

    overtimeRequest.status = "rejected";
    overtimeRequest.approvedBy = approverId as any;
    overtimeRequest.approvedAt = new Date();
    overtimeRequest.rejectionReason = rejectionReason;

    const savedRequest = await overtimeRequest.save();

    // Send notification to employee
    // TODO: Implement overtime notification methods
    // await NotificationService.getInstance().sendOvertimeApprovalNotification(savedRequest, false, rejectionReason);

    return savedRequest;
  }

  static async getAllOvertimeRequests(
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{ requests: IOvertimeRequest[]; total: number }> {
    const query: any = {};

    if (status && ["pending", "approved", "rejected"].includes(status)) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      OvertimeRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("employeeId", "name email")
        .populate("approvedBy", "name")
        .exec(),
      OvertimeRequest.countDocuments(query),
    ]);

    return { requests, total };
  }

  static async getApprovers(): Promise<any[]> {
    // Get users with admin or hr roles
    const adminRole = await Role.findOne({ name: "admin" });
    const hrRole = await Role.findOne({ name: "hr" });
    const managerRole = await Role.findOne({ name: "manager" });

    const roleIds = [adminRole?._id, hrRole?._id, managerRole?._id].filter(
      Boolean
    );

    const approvers = await User.find({
      role: { $in: roleIds },
      isdisable: false,
      isdeleted: false,
    })
      .select("fullname department position email")
      .populate("role", "name")
      .exec();

    return approvers.map((user) => ({
      _id: user._id,
      fullname: user.fullname,
      department: user.department,
      position: user.position,
      email: user.email,
      role: user.role,
    }));
  }
}
