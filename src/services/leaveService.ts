import LeaveRequest, { ILeaveRequest } from "../models/leave";
import LeavePolicy, { DEFAULT_LEAVE_POLICIES } from "../models/leavePolicy";
import User from "../models/user";
import Role from "../models/role";
import NotificationService from "../services/notificationService";

export interface LeaveSummary {
  thisMonthDays: number;
  thisYearDays: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  remainingDays: number;
  totalAllowedDays: number;
  leaveBalanceByType: {
    [key: string]: {
      used: number;
      remaining: number;
      total: number;
    };
  };
}

export interface LeaveRequestData {
  type: "annual" | "sick" | "personal" | "maternity" | "unpaid";
  startDate: Date;
  endDate: Date;
  reason: string;
  approverId?: string;
}

export class LeaveService {
  // Initialize default leave policies if they don't exist
  static async initializeLeavePolicies(): Promise<void> {
    try {
      const existingPolicies = await LeavePolicy.find();
      if (existingPolicies.length === 0) {
        await LeavePolicy.insertMany(DEFAULT_LEAVE_POLICIES);
      }
    } catch (error) {
      console.error("❌ Error initializing leave policies:", error);
    }
  }

  static async getLeaveSummary(employeeId: string): Promise<LeaveSummary> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get leave policies
    const policies = await LeavePolicy.find({ isActive: true });
    const policyMap = new Map(policies.map((p) => [p.leaveType, p]));

    // Get this month's approved leave days
    const thisMonthRequests = await LeaveRequest.find({
      employeeId,
      status: "approved",
      startDate: { $gte: startOfMonth },
    });
    const thisMonthDays = thisMonthRequests.reduce(
      (sum, req) => sum + req.duration,
      0
    );

    // Get this year's approved leave days by type
    const thisYearRequests = await LeaveRequest.find({
      employeeId,
      status: "approved",
      startDate: { $gte: startOfYear },
    });

    // Calculate balance by leave type
    const leaveBalanceByType: {
      [key: string]: { used: number; remaining: number; total: number };
    } = {};
    let totalUsedDays = 0;
    let totalAllowedDays = 0;

    for (const [leaveType, policy] of policyMap) {
      const usedDays = thisYearRequests
        .filter((req) => req.type === leaveType)
        .reduce((sum, req) => sum + req.duration, 0);

      const totalDays = policy.maxDaysPerYear;
      const remainingDays = Math.max(0, totalDays - usedDays);

      leaveBalanceByType[leaveType] = {
        used: usedDays,
        remaining: remainingDays,
        total: totalDays,
      };

      if (leaveType === "annual") {
        totalUsedDays = usedDays;
        totalAllowedDays = totalDays;
      }
    }

    // Get request counts and days
    const [pendingRequestsData, approvedRequestsData, rejectedRequestsData] =
      await Promise.all([
        LeaveRequest.find({ employeeId, status: "pending" }),
        LeaveRequest.find({ employeeId, status: "approved" }),
        LeaveRequest.find({ employeeId, status: "rejected" }),
      ]);

    const pendingRequests = pendingRequestsData.reduce(
      (sum, req) => sum + req.duration,
      0
    );
    const approvedRequests = approvedRequestsData.reduce(
      (sum, req) => sum + req.duration,
      0
    );
    const rejectedRequests = rejectedRequestsData.reduce(
      (sum, req) => sum + req.duration,
      0
    );

    // Use annual leave for main summary (backward compatibility)
    const annualBalance = leaveBalanceByType["annual"] || {
      used: 0,
      remaining: 0,
      total: 12,
    };

    return {
      thisMonthDays,
      thisYearDays: totalUsedDays,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      remainingDays: annualBalance.remaining,
      totalAllowedDays: annualBalance.total,
      leaveBalanceByType,
    };
  }

  static async getLeaveHistory(
    employeeId: string,
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<ILeaveRequest[]> {
    const query: any = { employeeId };

    if (
      status &&
      ["pending", "approved", "rejected", "cancelled"].includes(status)
    ) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const populatedRequests = await LeaveRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("assignedApproverId", "fullname email")
      .populate("approvedBy", "fullname email")
      .exec();

    return populatedRequests;
  }

  static async submitLeaveRequest(
    employeeId: string,
    requestData: LeaveRequestData
  ): Promise<ILeaveRequest> {
    // Get employee info
    const employee = await User.findById(employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    // Get leave policy for this type
    const policy = await LeavePolicy.findOne({
      leaveType: requestData.type,
      isActive: true,
    });
    if (!policy) {
      throw new Error(`Leave policy not found for type: ${requestData.type}`);
    }

    // Validate dates
    const startDate = new Date(requestData.startDate);
    const endDate = new Date(requestData.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      throw new Error("Start date cannot be in the past");
    }

    if (endDate < startDate) {
      throw new Error("End date must be after start date");
    }

    // Calculate duration
    const duration =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)
      ) + 1;

    // Validate against policy limits
    if (duration > policy.maxDaysPerRequest) {
      throw new Error(
        `Leave duration cannot exceed ${policy.maxDaysPerRequest} days per request for ${requestData.type} leave`
      );
    }

    // Check advance notice requirement
    const advanceNotice = Math.ceil(
      (startDate.getTime() - today.getTime()) / (1000 * 3600 * 24)
    );
    if (advanceNotice < policy.advanceNoticeDays) {
      throw new Error(
        `${requestData.type} leave requires at least ${policy.advanceNoticeDays} days advance notice`
      );
    }

    // Check annual balance if it's annual leave
    if (requestData.type === "annual") {
      const summary = await this.getLeaveSummary(employeeId);
      const annualBalance = summary.leaveBalanceByType["annual"];
      if (annualBalance && duration > annualBalance.remaining) {
        throw new Error(
          `Insufficient annual leave balance. You have ${annualBalance.remaining} days remaining`
        );
      }
    }

    // // Check for overlapping leave requests
    // const overlappingRequest = await LeaveRequest.findOne({
    //   employeeId,
    //   status: { $in: ["pending", "approved"] },
    //   $or: [
    //     {
    //       startDate: { $lte: endDate },
    //       endDate: { $gte: startDate },
    //     },
    //   ],
    // });

    // if (overlappingRequest) {
    //   throw new Error("You already have a leave request for this period");
    // }

    // Create leave request
    const leaveRequest = new LeaveRequest({
      employeeId,
      employeeName: employee.fullname,
      type: requestData.type,
      startDate,
      endDate,
      reason: requestData.reason,
      assignedApproverId: requestData.approverId || null,
    });

    await leaveRequest.save();

    // Send notification to approver(s)
    try {
      const notificationService = NotificationService.getInstance();
      if (requestData.approverId) {
        await notificationService.createAndSendNotification({
          title: "New Leave Request",
          message: `${employee.fullname} has submitted a leave request for approval`,
          type: "leave_request",
          recipientIds: [requestData.approverId],
          data: { leaveRequestId: (leaveRequest._id as any).toString() },
        });
      } else {
        // Send to all admins/HR if no specific approver
        const approvers = await this.getApprovers();
        const approverIds = approvers.map((approver) =>
          approver._id.toString()
        );
        await notificationService.createAndSendNotification({
          title: "New Leave Request",
          message: `${employee.fullname} has submitted a leave request for approval`,
          type: "leave_request",
          recipientIds: approverIds,
          data: { leaveRequestId: (leaveRequest._id as any).toString() },
        });
      }
    } catch (error) {
      console.error("Failed to send notification:", error);
    }

    return leaveRequest;
  }

  static async updateLeaveRequest(
    requestId: string,
    employeeId: string,
    requestData: LeaveRequestData
  ): Promise<ILeaveRequest> {
    const leaveRequest = await LeaveRequest.findOne({
      _id: requestId,
      employeeId,
      status: "pending",
    });

    if (!leaveRequest) {
      throw new Error("Leave request not found or cannot be updated");
    }

    // Validate dates
    const startDate = new Date(requestData.startDate);
    const endDate = new Date(requestData.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      throw new Error("Start date cannot be in the past");
    }

    if (endDate < startDate) {
      throw new Error("End date must be after start date");
    }

    // Check for overlapping leave requests (excluding current request)
    const overlappingRequest = await LeaveRequest.findOne({
      _id: { $ne: requestId },
      employeeId,
      status: { $in: ["pending", "approved"] },
      $or: [
        {
          startDate: { $lte: endDate },
          endDate: { $gte: startDate },
        },
      ],
    });

    if (overlappingRequest) {
      throw new Error("You already have a leave request for this period");
    }

    // Update leave request
    leaveRequest.type = requestData.type;
    leaveRequest.startDate = startDate;
    leaveRequest.endDate = endDate;
    leaveRequest.reason = requestData.reason;

    await leaveRequest.save();
    return leaveRequest;
  }

  static async cancelLeaveRequest(
    requestId: string,
    employeeId: string
  ): Promise<boolean> {
    const leaveRequest = await LeaveRequest.findOne({
      _id: requestId,
      employeeId,
      status: "pending",
    });

    if (!leaveRequest) {
      return false;
    }

    leaveRequest.status = "cancelled";
    await leaveRequest.save();
    return true;
  }

  static async getLeaveRequestById(
    requestId: string,
    employeeId: string
  ): Promise<ILeaveRequest | null> {
    const leaveRequest = await LeaveRequest.findOne({
      _id: requestId,
      employeeId,
    })
      .populate("assignedApproverId", "fullname email")
      .populate("approvedBy", "fullname email")
      .exec();

    return leaveRequest;
  }

  static async getApprovers(): Promise<any[]> {
    const approverRoles = await Role.find({
      name: { $in: ["admin", "hr", "manager"] },
    });

    const roleIds = approverRoles.map((role) => role._id);

    const approvers = await User.find({
      role: { $in: roleIds },
      isActive: true,
    })
      .populate("role", "name")
      .select("fullname department position email role")
      .exec();

    return approvers;
  }

  // Admin/HR methods
  static async approveLeaveRequest(
    requestId: string,
    approverId: string
  ): Promise<ILeaveRequest> {
    const leaveRequest = await LeaveRequest.findOne({
      _id: requestId,
      status: "pending",
    });

    if (!leaveRequest) {
      throw new Error("Leave request not found or already processed");
    }

    leaveRequest.status = "approved";
    leaveRequest.approvedBy = approverId as any;
    leaveRequest.approvedAt = new Date();

    await leaveRequest.save();

    // Send notification to employee
    try {
      const notificationService = NotificationService.getInstance();
      await notificationService.createAndSendNotification({
        title: "Leave Request Approved",
        message: `Your leave request has been approved`,
        type: "leave_approved",
        recipientIds: [leaveRequest.employeeId.toString()],
        data: { leaveRequestId: (leaveRequest._id as any).toString() },
      });
    } catch (error) {
      console.error("Failed to send notification:", error);
    }

    return leaveRequest;
  }

  static async rejectLeaveRequest(
    requestId: string,
    approverId: string,
    rejectionReason: string
  ): Promise<ILeaveRequest> {
    const leaveRequest = await LeaveRequest.findOne({
      _id: requestId,
      status: "pending",
    });

    if (!leaveRequest) {
      throw new Error("Leave request not found or already processed");
    }

    leaveRequest.status = "rejected";
    leaveRequest.approvedBy = approverId as any;
    leaveRequest.approvedAt = new Date();
    leaveRequest.rejectionReason = rejectionReason;

    await leaveRequest.save();

    // Send notification to employee
    try {
      const notificationService = NotificationService.getInstance();
      await notificationService.createAndSendNotification({
        title: "Leave Request Rejected",
        message: `Your leave request has been rejected: ${rejectionReason}`,
        type: "leave_rejected",
        recipientIds: [leaveRequest.employeeId.toString()],
        data: { leaveRequestId: (leaveRequest._id as any).toString() },
      });
    } catch (error) {
      console.error("Failed to send notification:", error);
    }

    return leaveRequest;
  }

  static async getAllLeaveRequests(
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{ requests: ILeaveRequest[]; total: number }> {
    const query: any = {};

    if (
      status &&
      ["pending", "approved", "rejected", "cancelled"].includes(status)
    ) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      LeaveRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("employeeId", "fullname email department")
        .populate("assignedApproverId", "fullname email")
        .populate("approvedBy", "fullname email")
        .exec(),
      LeaveRequest.countDocuments(query),
    ]);

    return { requests, total };
  }
}
