import AttendanceModel from "../models/attendance";
import User from "../models/user";
import { v2 as cloudinary } from "cloudinary";
import { uploadToCloudinary } from "../utils/cloudinary";
import { verifyFace } from "../utils/faceVerification";
import { AUTH_ERRORS } from "../utils/constants";
import {
  AttendanceDocument,
  InputLocationData,
  DBLocationData,
} from "../types/attendance";

/**
 * Calculate total working hours between check-in and check-out
 */
export const calculateTotalHours = (
  checkIn?: Date,
  checkOut?: Date
): string => {
  if (!checkIn || !checkOut) {
    return "--";
  }
  const diffMs = checkOut.getTime() - checkIn.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

/**
 * Calculate overtime hours (based on 8 standard working hours)
 */
export const calculateOvertime = (
  checkIn?: Date,
  checkOut?: Date,
  standardHours: number = 8
): string => {
  if (!checkIn || !checkOut) {
    return "--";
  }
  const diffMs = checkOut.getTime() - checkIn.getTime();
  const totalHours = diffMs / (1000 * 60 * 60);
  const overtimeHours = Math.max(0, totalHours - standardHours);
  const hours = Math.floor(overtimeHours);
  const minutes = Math.floor((overtimeHours - hours) * 60);
  return `${hours}h ${minutes}m`;
};

/**
 * Handle employee check-in with face verification
 */
export const CheckIn = async (
  userId: string,
  image: Buffer,
  locationInput: InputLocationData,
  deviceInfo?: any,
  _departmentId?: string
): Promise<AttendanceDocument> => {
  const user = await User.findById(userId);
  if (!user || !user.referenceImageUrl) {
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND_OR_NO_REFERENCE_IMAGE);
  }

  const imageUrl = await uploadToCloudinary(image, "attendance_images");

  let isFaceMatch = false;
  try {
    isFaceMatch = await verifyFace(imageUrl, user.referenceImageUrl as string);
  } catch (verificationError: any) {
    throw new Error(
      `Face verification service error: ${verificationError.message}`
    );
  }

  if (!isFaceMatch) {
    throw new Error("Face verification failed");
  }

  const workDate = new Date().toISOString().split("T")[0];
  let attendance = await AttendanceModel.findOne({
    employeeId: userId,
    workDate,
  });

  if (!attendance) {
    attendance = new AttendanceModel({
      employeeId: userId,
      workDate,
      status: "PRESENT",
      checkIns: [],
      checkOuts: [],
    });
  }

  const checkInTime = new Date();

  const locationForDb: DBLocationData = {
    address: locationInput.address,
    coordinates: {
      type: "Point" as const,
      coordinates: locationInput.coordinates,
    },
  };

  const newCheckInEntry = {
    time: checkInTime,
    imageUrl,
    location: locationForDb,
    deviceInfo: deviceInfo || null,
  };

  // Ensure arrays exist
  if (!attendance.checkIns) {
    attendance.checkIns = [];
  }
  if (!attendance.checkOuts) {
    attendance.checkOuts = [];
  }

  // Enforce alternating check-in/check-out pattern
  if (attendance.checkIns.length > attendance.checkOuts.length) {
    throw new Error("You must check-out before checking-in again");
  }

  attendance.checkIns.push(newCheckInEntry);

  // Update backward compatibility field - save first check-in
  if (!attendance.checkIn) {
    attendance.checkIn = newCheckInEntry;
  }

  // Calculate based on first check-in and last check-out (if exists)
  const firstCheckIn =
    attendance.checkIns && attendance.checkIns.length > 0
      ? attendance.checkIns[0].time
      : checkInTime;

  const lastCheckOut =
    attendance.checkOuts && attendance.checkOuts.length > 0
      ? attendance.checkOuts[attendance.checkOuts.length - 1].time
      : attendance.checkOut?.time;

  attendance.totalHours = calculateTotalHours(firstCheckIn, lastCheckOut);
  attendance.overtime = calculateOvertime(firstCheckIn, lastCheckOut);

  await attendance.save();

  return attendance as AttendanceDocument;
};

/**
 * Handle employee check-out with face verification
 */
export const CheckOut = async (
  userId: string,
  image: Buffer,
  locationInput: InputLocationData,
  deviceInfo?: any,
  _departmentId?: string
): Promise<AttendanceDocument> => {
  const user = await User.findById(userId);
  if (!user || !user.referenceImageUrl) {
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND_OR_NO_REFERENCE_IMAGE);
  }

  const imageUrl = await uploadToCloudinary(image, "attendance_images");

  let isFaceMatch = false;
  try {
    isFaceMatch = await verifyFace(imageUrl, user.referenceImageUrl as string);
  } catch (verificationError: any) {
    throw new Error(
      `Face verification service error: ${verificationError.message}`
    );
  }

  if (!isFaceMatch) {
    throw new Error("Face verification failed");
  }

  const workDate = new Date().toISOString().split("T")[0];
  const attendance = await AttendanceModel.findOne({
    employeeId: userId,
    workDate,
  });

  if (!attendance) {
    throw new Error("No attendance record found for today");
  }

  const checkOutTime = new Date();

  const locationForDb: DBLocationData = {
    address: locationInput.address,
    coordinates: {
      type: "Point" as const,
      coordinates: locationInput.coordinates,
    },
  };

  const newCheckOutEntry = {
    time: checkOutTime,
    imageUrl,
    location: locationForDb,
    deviceInfo: deviceInfo || null,
  };

  // Ensure arrays exist
  if (!attendance.checkIns) {
    attendance.checkIns = [];
  }
  if (!attendance.checkOuts) {
    attendance.checkOuts = [];
  }

  // Enforce alternating check-in/check-out pattern
  if (attendance.checkIns.length === 0) {
    throw new Error("You must check-in before checking-out");
  }

  if (attendance.checkOuts.length >= attendance.checkIns.length) {
    throw new Error(
      "You have already checked-out, please check-in before checking-out again"
    );
  }

  attendance.checkOuts.push(newCheckOutEntry);

  // Update backward compatibility field - save latest check-out
  attendance.checkOut = newCheckOutEntry;

  // Calculate based on first check-in and latest check-out
  const firstCheckIn =
    attendance.checkIns && attendance.checkIns.length > 0
      ? attendance.checkIns[0].time
      : attendance.checkIn?.time;

  const lastCheckOut = checkOutTime;

  if (firstCheckIn) {
    attendance.totalHours = calculateTotalHours(firstCheckIn, lastCheckOut);
    attendance.overtime = calculateOvertime(firstCheckIn, lastCheckOut);
  } else {
    attendance.totalHours = "--";
    attendance.overtime = "--";
  }

  try {
    await attendance.save();
  } catch (dbError: any) {
    throw dbError;
  }

  return attendance as AttendanceDocument;
};

/**
 * Calculate department-based salary from work sessions
 * (Currently not used - for future department salary feature)
 */
export const calculateDepartmentBasedSalary = (
  checkIns: any[],
  checkOuts: any[]
): {
  totalSalary: number;
  departmentBreakdown: Array<{
    departmentId: string;
    hours: number;
    hourlyRate: number;
    salary: number;
  }>;
} => {
  const departmentBreakdown: Array<{
    departmentId: string;
    hours: number;
    hourlyRate: number;
    salary: number;
  }> = [];

  const workSessions: Array<{
    checkIn: any;
    checkOut: any;
    hours: number;
  }> = [];

  // Sort by time
  const sortedCheckIns = [...checkIns].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
  const sortedCheckOuts = [...checkOuts].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  // Pair check-ins with corresponding check-outs
  for (let i = 0; i < sortedCheckIns.length; i++) {
    const checkIn = sortedCheckIns[i];
    const checkOut = sortedCheckOuts.find(
      (co) => new Date(co.time).getTime() > new Date(checkIn.time).getTime()
    );

    if (checkOut) {
      const hours =
        (new Date(checkOut.time).getTime() - new Date(checkIn.time).getTime()) /
        (1000 * 60 * 60);
      workSessions.push({
        checkIn,
        checkOut,
        hours,
      });
    }
  }

  // Calculate salary for each session
  const departmentMap = new Map<
    string,
    {
      hours: number;
      hourlyRate: number;
      salary: number;
    }
  >();

  workSessions.forEach((session) => {
    const departmentId = session.checkIn.departmentId.toString();
    const hourlyRate = session.checkIn.hourlyRate;
    const sessionSalary = session.hours * hourlyRate;

    if (departmentMap.has(departmentId)) {
      const existing = departmentMap.get(departmentId)!;
      existing.hours += session.hours;
      existing.salary += sessionSalary;
    } else {
      departmentMap.set(departmentId, {
        hours: session.hours,
        hourlyRate,
        salary: sessionSalary,
      });
    }
  });

  // Convert Map to array
  departmentMap.forEach((value, departmentId) => {
    departmentBreakdown.push({
      departmentId,
      hours: Math.round(value.hours * 100) / 100,
      hourlyRate: value.hourlyRate,
      salary: Math.round(value.salary),
    });
  });

  const totalSalary = departmentBreakdown.reduce(
    (sum, dept) => sum + dept.salary,
    0
  );

  return {
    totalSalary,
    departmentBreakdown,
  };
};

/**
 * Get detailed salary breakdown for a specific day
 * (Currently commented out - for future department salary feature)
 */
/* export const getDailySalaryBreakdown = async (
  userId: string,
  workDate: string
): Promise<{
  totalSalary: number;
  departmentBreakdown: Array<{
    departmentId: string;
    departmentName?: string;
    hours: number;
    hourlyRate: number;
    salary: number;
  }>;
  workSessions: Array<{
    checkInTime: Date;
    checkOutTime: Date;
    departmentId: string;
    departmentName?: string;
    hours: number;
    hourlyRate: number;
    salary: number;
  }>;
}> => {
  const attendance = await AttendanceModel.findOne({
    employeeId: userId,
    workDate,
  }).populate("checkIns.departmentId checkOuts.departmentId", "name");

  if (!attendance || !attendance.checkIns || !attendance.checkOuts) {
    return {
      totalSalary: 0,
      departmentBreakdown: [],
      workSessions: [],
    };
  }

  const salaryInfo = calculateDepartmentBasedSalary(
    attendance.checkIns,
    attendance.checkOuts
  );

  // Thêm tên bộ phận vào breakdown
  const departmentBreakdownWithNames = salaryInfo.departmentBreakdown.map(
    (dept) => ({
      ...dept,
      departmentName: "Unknown Department", // Will be populated from database
    })
  );

  // Create detailed work session information
  const workSessions: Array<{
    checkInTime: Date;
    checkOutTime: Date;
    departmentId: string;
    departmentName?: string;
    hours: number;
    hourlyRate: number;
    salary: number;
  }> = [];

  // Similar logic to calculateDepartmentBasedSalary but returns session details
  const sortedCheckIns = [...attendance.checkIns].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
  const sortedCheckOuts = [...attendance.checkOuts].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  for (let i = 0; i < sortedCheckIns.length; i++) {
    const checkIn = sortedCheckIns[i];
    const checkOut = sortedCheckOuts.find(
      (co) => new Date(co.time).getTime() > new Date(checkIn.time).getTime()
    );

    if (checkOut) {
      const hours =
        (new Date(checkOut.time).getTime() - new Date(checkIn.time).getTime()) /
        (1000 * 60 * 60);
      const salary = hours * checkIn.hourlyRate;

      workSessions.push({
        checkInTime: checkIn.time,
        checkOutTime: checkOut.time,
        departmentId: checkIn.departmentId.toString(),
        departmentName: "Unknown Department", // Will be populated
        hours: Math.round(hours * 100) / 100,
        hourlyRate: checkIn.hourlyRate,
        salary: Math.round(salary),
      });
    }
  }

  return {
    totalSalary: salaryInfo.totalSalary,
    departmentBreakdown: departmentBreakdownWithNames,
    workSessions,
  };
}; */

/**
 * Update and get current attendance status for today
 */
export const updateAttendanceStatus = async (
  userId: string
): Promise<{
  checkInTime: string | null;
  checkOutTime: string;
  totalHours: string;
  overtime: string;
}> => {
  const workDate = new Date().toISOString().split("T")[0];
  const attendance = await AttendanceModel.findOne({
    employeeId: userId,
    workDate,
  });

  if (!attendance) {
    return {
      checkInTime: null,
      checkOutTime: "--:-- --",
      totalHours: "--",
      overtime: "--",
    };
  }

  const formatTime = (date: Date): string => {
    const hours = date.getHours() % 12 || 12;
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const period = date.getHours() >= 12 ? "PM" : "AM";
    return `${hours}:${minutes} ${period}`;
  };

  // Handle multiple check-ins/check-outs - prioritize arrays
  let firstCheckInTime = null;
  let lastCheckOutTime = null;

  if (attendance.checkIns && attendance.checkIns.length > 0) {
    // Sort by time and get first check-in
    const sortedCheckIns = [...attendance.checkIns].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    firstCheckInTime = sortedCheckIns[0].time;
  } else if (attendance.checkIn?.time) {
    // Fallback to backward compatibility field
    firstCheckInTime = attendance.checkIn.time;
  }

  if (attendance.checkOuts && attendance.checkOuts.length > 0) {
    // Sort by time and get last check-out
    const sortedCheckOuts = [...attendance.checkOuts].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    lastCheckOutTime = sortedCheckOuts[sortedCheckOuts.length - 1].time;
  } else if (attendance.checkOut?.time) {
    // Fallback to backward compatibility field
    lastCheckOutTime = attendance.checkOut.time;
  }

  const checkInTime = firstCheckInTime
    ? formatTime(new Date(firstCheckInTime))
    : null;
  const checkOutTime = lastCheckOutTime
    ? formatTime(new Date(lastCheckOutTime))
    : "--:-- --";
  const currentTime = new Date();

  let totalHours = attendance.totalHours || "--";
  let overtime = attendance.overtime || "--";

  // Check current status: if checked-in but not fully checked-out
  const hasActiveSession =
    attendance.checkIns &&
    attendance.checkOuts &&
    attendance.checkIns.length > attendance.checkOuts.length;

  if (firstCheckInTime && hasActiveSession) {
    // Currently in work session, calculate real-time
    totalHours = calculateTotalHours(firstCheckInTime, currentTime);
    overtime = calculateOvertime(firstCheckInTime, currentTime);
  } else if (firstCheckInTime && lastCheckOutTime) {
    // All sessions completed, use calculated data
    totalHours = attendance.totalHours || "--";
    overtime = attendance.overtime || "--";
  }

  return {
    checkInTime,
    checkOutTime,
    totalHours,
    overtime,
  };
};

/**
 * Parse duration string to minutes
 */
const parseDurationToMinutes = (durationStr: string): number => {
  if (!durationStr || durationStr === "--") {
    return 0;
  }
  let totalMinutes = 0;
  const hoursMatch = durationStr.match(/(\d+)\s*h/);
  const minutesMatch = durationStr.match(/(\d+)\s*m/);

  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1], 10) * 60;
  }
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1], 10);
  }
  return totalMinutes;
};

/**
 * Format minutes to duration string
 */
const formatMinutesToDuration = (totalMinutes: number): string => {
  if (totalMinutes <= 0) {
    return "0h 0m";
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}h ${minutes}m`;
};

/**
 * Get current week date range (Monday to Sunday)
 */
const getCurrentWeekRange = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  const firstDayOfWeek = new Date(today);
  // Adjust to start week on Monday
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  firstDayOfWeek.setDate(diff);

  const lastDayOfWeek = new Date(firstDayOfWeek);
  lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
  lastDayOfWeek.setHours(23, 59, 59, 999); // End of Sunday

  return { start: firstDayOfWeek, end: lastDayOfWeek };
};

/**
 * Get current month date range
 */
const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999); // End of last day of month

  return { start, end };
};

/**
 * Get weekly attendance summary
 */
export const getWeekSummary = async (userId: string) => {
  const { start, end } = getCurrentWeekRange();

  // Get all records in the week (including weekends)
  const weeklyRecords = await AttendanceModel.find({
    employeeId: userId,
    workDate: {
      $gte: start.toISOString().split("T")[0],
      $lte: end.toISOString().split("T")[0],
    },
    status: "PRESENT", // Only count working days
  }).lean();

  let totalMinutes = 0;
  let overtimeMinutes = 0;
  let lateArrivals = 0;

  // Total days in week (7 days) instead of limiting to 5 days
  const totalDaysInWeek = 7;

  for (const record of weeklyRecords) {
    // Calculate total hours and overtime
    if (record.totalHours)
      totalMinutes += parseDurationToMinutes(record.totalHours);
    if (record.overtime)
      overtimeMinutes += parseDurationToMinutes(record.overtime);

    // Check late arrivals based on first check-in (e.g., after 9:05 AM)
    let firstCheckInTime = null;

    if (record.checkIns && record.checkIns.length > 0) {
      // Sort by time and get first check-in
      const sortedCheckIns = [...record.checkIns].sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
      );
      firstCheckInTime = sortedCheckIns[0].time;
    } else if (record.checkIn?.time) {
      // Fallback to backward compatibility field
      firstCheckInTime = record.checkIn.time;
    }

    if (firstCheckInTime) {
      const checkInTime = new Date(firstCheckInTime);
      if (
        checkInTime.getHours() > 9 ||
        (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 5)
      ) {
        lateArrivals++;
      }
    }
  }

  const workDays = weeklyRecords.length;
  const performance = totalDaysInWeek > 0 ? workDays / totalDaysInWeek : 0;

  return {
    workDays: `${workDays} / ${totalDaysInWeek}`,
    totalHours: formatMinutesToDuration(totalMinutes),
    overtime: formatMinutesToDuration(overtimeMinutes),
    lateArrivals: lateArrivals,
    performance: parseFloat(performance.toFixed(2)), // return as decimal, e.g., 0.8
  };
};

/**
 * Get monthly attendance summary
 */
export const getMonthSummary = async (userId: string) => {
  const { start, end } = getCurrentMonthRange();

  // Count total days in month (including weekends)
  const totalDaysInMonth = end.getDate();

  const monthlyRecords = await AttendanceModel.find({
    employeeId: userId,
    workDate: {
      $gte: start.toISOString().split("T")[0],
      $lte: end.toISOString().split("T")[0],
    },
  }).lean();

  let totalMinutes = 0;
  let overtimeMinutes = 0;
  let daysOff = 0;
  let actualWorkDays = 0;

  for (const record of monthlyRecords) {
    if (record.status === "ON_LEAVE") {
      daysOff++;
    } else if (record.status === "PRESENT") {
      actualWorkDays++;
      if (record.totalHours)
        totalMinutes += parseDurationToMinutes(record.totalHours);
      if (record.overtime)
        overtimeMinutes += parseDurationToMinutes(record.overtime);
    }
  }

  return {
    workDays: `${actualWorkDays} / ${totalDaysInMonth}`,
    totalHours: formatMinutesToDuration(totalMinutes),
    overtime: formatMinutesToDuration(overtimeMinutes),
    daysOff: daysOff,
  };
};

/**
 * Upload employee face image for attendance verification
 */
export const UploadEmployeeFace = async (
  userId: string,
  file: Buffer
): Promise<string> => {
  const user = await User.findById(userId);
  if (!user || user.isdeleted || user.isdisable) {
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND);
  }

  // Get public_id of old image if exists
  let oldPublicId: string | null = null;
  if (user.referenceImageUrl) {
    const urlParts = user.referenceImageUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];
    oldPublicId = `employee_faces/${fileName.split(".")[0]}`;
  }

  const imageUrl = await uploadToCloudinary(file, "employee_faces");

  if (oldPublicId) {
    try {
      await cloudinary.uploader.destroy(oldPublicId);
    } catch (error) {}
  }

  // Update new image URL
  user.referenceImageUrl = imageUrl;
  await user.save();
  return imageUrl;
};

/**
 * Format date to AM/PM time string
 */
const formatTimeToAMPM = (date?: Date): string => {
  if (!date) {
    return "--:--";
  }
  return new Date(date).toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Get paginated attendance history for an employee
 * Shows all check-ins/check-outs in a day (each pair as separate row)
 * @param userId Employee ID
 * @param page Current page number (default 1)
 * @param limit Number of records per page (default 10)
 * @returns Object containing history list and pagination info
 */
export const getAttendanceHistory = async (
  userId: string,
  page: number = 1,
  limit: number = 10
) => {
  const skip = (page - 1) * limit;

  const records = await AttendanceModel.find({
    employeeId: userId,
    status: "PRESENT", // Only get working days
  })
    .sort({ workDate: -1 }) // Sort descending by date
    .skip(skip)
    .limit(limit)
    .lean(); // .lean() for better performance and plain JS objects

  // Get total records count for pagination
  const totalRecords = await AttendanceModel.countDocuments({
    employeeId: userId,
    status: "PRESENT",
  });

  const formattedHistory: any[] = [];

  records.forEach((record) => {
    const workDate = new Date(record.workDate);
    // Format date as "Month Day", e.g., "June 24"
    const dateFormatted = workDate.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
    });

    // Handle multiple check-ins/check-outs in a day
    if (record.checkIns && record.checkIns.length > 0) {
      // Sort check-ins and check-outs by time
      const sortedCheckIns = [...record.checkIns].sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
      );
      const sortedCheckOuts = record.checkOuts
        ? [...record.checkOuts].sort(
            (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
          )
        : [];

      // Create check-in/check-out pairs
      for (let i = 0; i < sortedCheckIns.length; i++) {
        const checkIn = sortedCheckIns[i];
        const checkOut = sortedCheckOuts[i]; // May be undefined if not checked-out yet

        // Calculate working time for this pair
        let sessionHours = "--";
        if (checkIn && checkOut) {
          sessionHours = calculateTotalHours(checkIn.time, checkOut.time);
        }

        formattedHistory.push({
          id: `${record._id.toString()}_${i}`, // Unique ID for each session
          date: i === 0 ? dateFormatted : `${dateFormatted} (${i + 1})`, // Number sessions
          checkIn: formatTimeToAMPM(checkIn.time),
          checkOut: checkOut ? formatTimeToAMPM(checkOut.time) : "--:--",
          totalHours: sessionHours,
        });
      }
    } else {
      // Fallback to backward compatibility fields
      formattedHistory.push({
        id: record._id.toString(),
        date: dateFormatted,
        checkIn: formatTimeToAMPM(record.checkIn?.time),
        checkOut: formatTimeToAMPM(record.checkOut?.time),
        totalHours: record.totalHours || "--",
      });
    }
  });

  return {
    history: formattedHistory,
    currentPage: page,
    totalPages: Math.ceil(totalRecords / limit),
    totalRecords: totalRecords,
  };
};

/**
 * Lấy chi tiết tất cả các lần chấm công trong một ngày cụ thể
 * @param userId ID của nhân viên
 * @param workDate Ngày làm việc (format: YYYY-MM-DD)
 * @returns Chi tiết tất cả các session check-in/check-out trong ngày
 */
export const getDailyAttendanceDetails = async (
  userId: string,
  workDate: string
) => {
  const record = await AttendanceModel.findOne({
    employeeId: userId,
    workDate,
  }).lean();

  if (!record) {
    return {
      workDate,
      status: "No Record",
      sessions: [],
      totalSessions: 0,
      overallTotalHours: "--",
      overallOvertime: "--",
    };
  }

  const sessions: any[] = [];
  let overallTotalMinutes = 0;

  // Xử lý chấm công nhiều lần trong ngày
  if (record.checkIns && record.checkIns.length > 0) {
    // Sắp xếp check-ins và check-outs theo thời gian
    const sortedCheckIns = [...record.checkIns].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    const sortedCheckOuts = record.checkOuts
      ? [...record.checkOuts].sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
        )
      : [];

    // Tạo các session check-in/check-out
    for (let i = 0; i < sortedCheckIns.length; i++) {
      const checkIn = sortedCheckIns[i];
      const checkOut = sortedCheckOuts[i]; // Có thể undefined nếu chưa check-out

      // Tính thời gian làm việc cho session này
      let sessionHours = "--";
      let sessionMinutes = 0;
      if (checkIn && checkOut) {
        sessionHours = calculateTotalHours(checkIn.time, checkOut.time);
        sessionMinutes = parseDurationToMinutes(sessionHours);
        overallTotalMinutes += sessionMinutes;
      }

      sessions.push({
        sessionNumber: i + 1,
        checkIn: {
          time: formatTimeToAMPM(checkIn.time),
          fullTime: checkIn.time,
          location: checkIn.location?.address || "Unknown",
          imageUrl: checkIn.imageUrl,
        },
        checkOut: checkOut
          ? {
              time: formatTimeToAMPM(checkOut.time),
              fullTime: checkOut.time,
              location: checkOut.location?.address || "Unknown",
              imageUrl: checkOut.imageUrl,
            }
          : null,
        duration: sessionHours,
        status: checkOut ? "Completed" : "In Progress",
      });
    }
  } else {
    // Fallback về backward compatibility fields
    const sessionHours = record.totalHours || "--";
    if (sessionHours !== "--") {
      overallTotalMinutes = parseDurationToMinutes(sessionHours);
    }

    sessions.push({
      sessionNumber: 1,
      checkIn: record.checkIn
        ? {
            time: formatTimeToAMPM(record.checkIn.time),
            fullTime: record.checkIn.time,
            location: record.checkIn.location?.address || "Unknown",
            imageUrl: record.checkIn.imageUrl,
          }
        : null,
      checkOut: record.checkOut
        ? {
            time: formatTimeToAMPM(record.checkOut.time),
            fullTime: record.checkOut.time,
            location: record.checkOut.location?.address || "Unknown",
            imageUrl: record.checkOut.imageUrl,
          }
        : null,
      duration: sessionHours,
      status: record.checkOut ? "Completed" : "In Progress",
    });
  }

  return {
    workDate,
    status: record.status,
    sessions,
    totalSessions: sessions.length,
    overallTotalHours: formatMinutesToDuration(overallTotalMinutes),
    overallOvertime: record.overtime || "--",
  };
};

/**
 * Get monthly attendance details with daily breakdown
 * Now includes detailed sessions like Daily Details API
 */
export const getMonthlyDetails = async (
  userId: string,
  year: number,
  month: number
) => {
  // Get all attendance records for the month from DB
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  endDate.setHours(23, 59, 59, 999);

  const recordsOfMonth = await AttendanceModel.find({
    employeeId: userId,
    workDate: {
      $gte: startDate.toISOString().split("T")[0],
      $lte: endDate.toISOString().split("T")[0],
    },
  }).lean();

  const recordsMap = new Map(recordsOfMonth.map((r) => [r.workDate, r]));
  let summary = {
    workDays: 0,
    lateArrivals: 0,
    absences: 0,
    holidays: 0,
  };

  const daysInMonth = endDate.getDate();
  const dailyDetails = [];

  for (let day = 1; day <= daysInMonth; day++) {
    // Fix: Use UTC date to avoid timezone issues
    const currentDate = new Date(Date.UTC(year, month - 1, day));
    const workDateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    const dayOfWeek = currentDate.getUTCDay(); // 0:Sun, 1:Mon, ..., 6:Sat

    const record = recordsMap.get(workDateStr);

    let dayInfo: any = {
      date: currentDate.toISOString(), // ISO format for Flutter parsing
      status: "No Record", // Default: no record
      checkIn: "--:--",
      checkOut: "--:--",
      totalHours: "--",
      overtime: "--",
      sessionsCount: 0, // Number of check-ins in the day
      hasMultipleSessions: false, // Has multiple check-ins or not
      sessions: [], // Add detailed sessions like Daily Details API
    };

    if (record) {
      // Has attendance record
      dayInfo.totalHours = record.totalHours || "--";
      dayInfo.overtime = record.overtime || "--";

      // Build detailed sessions like Daily Details API
      const sessions: any[] = [];
      let firstCheckInTime = null;
      let lastCheckOutTime = null;

      if (record.checkIns && record.checkIns.length > 0) {
        // Sort check-ins and check-outs by time
        const sortedCheckIns = [...record.checkIns].sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
        );
        const sortedCheckOuts = record.checkOuts
          ? [...record.checkOuts].sort(
              (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
            )
          : [];

        firstCheckInTime = sortedCheckIns[0].time;
        dayInfo.checkIn = formatTimeToAMPM(firstCheckInTime);
        dayInfo.sessionsCount = sortedCheckIns.length;
        dayInfo.hasMultipleSessions = sortedCheckIns.length > 1;

        if (sortedCheckOuts.length > 0) {
          lastCheckOutTime = sortedCheckOuts[sortedCheckOuts.length - 1].time;
          dayInfo.checkOut = formatTimeToAMPM(lastCheckOutTime);
        }

        // Build sessions array
        for (let i = 0; i < sortedCheckIns.length; i++) {
          const checkIn = sortedCheckIns[i];
          const checkOut = sortedCheckOuts[i]; // May be undefined if not checked out yet

          const session: any = {
            sessionNumber: i + 1,
            checkIn: {
              time: formatTimeToAMPM(checkIn.time),
              fullTime: checkIn.time,
              location: checkIn.location?.address || "Unknown location",
              imageUrl: checkIn.imageUrl || "",
            },
            status: checkOut ? "Completed" : "In Progress",
          };

          if (checkOut) {
            session.checkOut = {
              time: formatTimeToAMPM(checkOut.time),
              fullTime: checkOut.time,
              location: checkOut.location?.address || "Unknown location",
              imageUrl: checkOut.imageUrl || "",
            };

            // Calculate duration for this session
            const checkInTime = new Date(checkIn.time);
            const checkOutTime = new Date(checkOut.time);
            const durationMs = checkOutTime.getTime() - checkInTime.getTime();
            const durationMinutes = Math.floor(durationMs / (1000 * 60));
            const hours = Math.floor(durationMinutes / 60);
            const minutes = durationMinutes % 60;
            session.duration = `${hours}h ${minutes}m`;
          } else {
            session.duration = "In progress";
          }

          sessions.push(session);
        }
      } else if (record.checkIn?.time) {
        // Fallback to backward compatibility field
        firstCheckInTime = record.checkIn.time;
        dayInfo.checkIn = formatTimeToAMPM(firstCheckInTime);
        dayInfo.sessionsCount = 1;
        dayInfo.hasMultipleSessions = false;

        if (record.checkOut?.time) {
          lastCheckOutTime = record.checkOut.time;
          dayInfo.checkOut = formatTimeToAMPM(lastCheckOutTime);
        }

        // Create single session for backward compatibility
        const session: any = {
          sessionNumber: 1,
          checkIn: {
            time: formatTimeToAMPM(record.checkIn.time),
            fullTime: record.checkIn.time,
            location: record.checkIn.location?.address || "Unknown location",
            imageUrl: record.checkIn.imageUrl || "",
          },
          status: record.checkOut ? "Completed" : "In Progress",
        };

        if (record.checkOut) {
          session.checkOut = {
            time: formatTimeToAMPM(record.checkOut.time),
            fullTime: record.checkOut.time,
            location: record.checkOut.location?.address || "Unknown location",
            imageUrl: record.checkOut.imageUrl || "",
          };

          // Calculate duration
          const checkInTime = new Date(record.checkIn.time);
          const checkOutTime = new Date(record.checkOut.time);
          const durationMs = checkOutTime.getTime() - checkInTime.getTime();
          const durationMinutes = Math.floor(durationMs / (1000 * 60));
          const hours = Math.floor(durationMinutes / 60);
          const minutes = durationMinutes % 60;
          session.duration = `${hours}h ${minutes}m`;
        } else {
          session.duration = "In progress";
        }

        sessions.push(session);
      }

      dayInfo.sessions = sessions;

      if (record.status === "ON_LEAVE") {
        dayInfo.status = "On Leave";
        // Don't count as workDays but also not absent
      } else if (record.status === "PRESENT") {
        dayInfo.status = "On Time";
        summary.workDays++;

        // Check late arrivals based on first check-in (e.g., after 9:05 AM)
        if (firstCheckInTime) {
          const checkInTime = new Date(firstCheckInTime);
          if (
            checkInTime.getHours() > 9 ||
            (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 5)
          ) {
            dayInfo.status = "Late";
            summary.lateArrivals++;
          }
        }
      } else if (record.status === "ABSENT") {
        dayInfo.status = "Absent";
        summary.absences++;
      }
    } else {
      // No attendance record
      // Distinguish between weekends and weekdays for appropriate display
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        dayInfo.status = "Weekend"; // Display as weekend
        // Don't count as absent since may not need to work
      } else {
        dayInfo.status = "No Record"; // Weekday with no record
        // Don't automatically count as absent - let user/admin decide
      }
    }

    dailyDetails.push(dayInfo);
  }

  return {
    dailyDetails, // Data for calendar
    summary, // Data for summary card at bottom
  };
};
