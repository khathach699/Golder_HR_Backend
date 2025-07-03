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

    const populatedRequests = await OvertimeRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("approvedBy", "name fullname")
      .populate("assignedApproverId", "name fullname")
      .exec();

    return populatedRequests;
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
    console.log("🔍 [SERVICE] Checking for existing requests...");
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

    console.log(
      "🔍 [SERVICE] Existing request:",
      existingRequest ? "Found" : "Not found"
    );

    if (existingRequest) {
      console.log(
        "❌ [SERVICE] You already have an overtime request for this date"
      );
      throw new Error("You already have an overtime request for this date");
    }

    // Calculate hours
    console.log("🔍 [SERVICE] Calculating hours...");
    const diffMs =
      requestData.endTime.getTime() - requestData.startTime.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    console.log("🔍 [SERVICE] Calculated hours:", hours);

    // Create overtime request
    console.log("🔍 [SERVICE] Creating overtime request...");
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

    console.log("🔍 [SERVICE] Saving overtime request...");
    const savedRequest = await overtimeRequest.save();
    console.log("✅ [SERVICE] Overtime request saved successfully");

    // Send notification to HR/managers
    try {
      const NotificationService = (await import("./notificationService"))
        .default;
      await NotificationService.getInstance().sendOvertimeRequestNotification(
        savedRequest
      );
      console.log("✅ [SERVICE] Overtime notification sent successfully");
    } catch (error) {
      console.error(
        "❌ [SERVICE] Failed to send overtime notification:",
        error
      );
    }

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
    })
      .populate("approvedBy", "name fullname")
      .populate("assignedApproverId", "name fullname");
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
    try {
      const NotificationService = (await import("./notificationService"))
        .default;
      await NotificationService.getInstance().sendOvertimeApprovalNotification(
        savedRequest,
        true
      );
      console.log(
        "✅ [SERVICE] Overtime approval notification sent successfully"
      );
    } catch (error) {
      console.error(
        "❌ [SERVICE] Failed to send overtime approval notification:",
        error
      );
    }

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
    try {
      const NotificationService = (await import("./notificationService"))
        .default;
      await NotificationService.getInstance().sendOvertimeApprovalNotification(
        savedRequest,
        false,
        rejectionReason
      );
      console.log(
        "✅ [SERVICE] Overtime rejection notification sent successfully"
      );
    } catch (error) {
      console.error(
        "❌ [SERVICE] Failed to send overtime rejection notification:",
        error
      );
    }

    return savedRequest;
  }

  static async getAllOvertimeRequests(
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{ requests: IOvertimeRequest[]; total: number }> {
    try {
      console.log(
        `🔍 [SERVICE] getAllOvertimeRequests called with page: ${page}, limit: ${limit}, status: ${status}`
      );

      const query: any = {};

      if (status && ["pending", "approved", "rejected"].includes(status)) {
        query.status = status;
      }

      console.log(`🔍 [SERVICE] Query:`, query);

      const skip = (page - 1) * limit;

      // First, let's check if there are any documents with invalid ObjectIds
      const allDocs = await OvertimeRequest.find({}).lean();
      console.log(
        `🔍 [SERVICE] Total documents in collection: ${allDocs.length}`
      );

      // Check for invalid ObjectIds
      const invalidDocs = allDocs.filter((doc) => {
        try {
          // Check if _id is a valid ObjectId
          if (typeof doc._id === "string" && doc._id.length !== 24) {
            return true;
          }
          return false;
        } catch (error) {
          return true;
        }
      });

      if (invalidDocs.length > 0) {
        console.log(
          `❌ [SERVICE] Found ${invalidDocs.length} documents with invalid ObjectIds:`,
          invalidDocs
        );
        // Clean up invalid documents
        for (const doc of invalidDocs) {
          await OvertimeRequest.deleteOne({ _id: doc._id });
          console.log(
            `🗑️ [SERVICE] Deleted invalid document with _id: ${doc._id}`
          );
        }
      }

      const [requests, total] = await Promise.all([
        OvertimeRequest.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("employeeId", "name email")
          .populate("approvedBy", "name fullname")
          .populate("assignedApproverId", "name fullname")
          .exec(),
        OvertimeRequest.countDocuments(query),
      ]);

      console.log(
        `🔍 [SERVICE] Found ${requests.length} requests, total: ${total}`
      );
      return { requests, total };
    } catch (error) {
      console.error(`❌ [SERVICE] Error in getAllOvertimeRequests:`, error);
      throw error;
    }
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
