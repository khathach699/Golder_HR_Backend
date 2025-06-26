// services/attendanceService.ts
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
// TODO: Tạm thời comment để tập trung vào chấm công nhiều lần
// import { getDepartmentSalaryInfo } from "./departmentSalaryService";

// Hàm tính tổng số giờ làm việc
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

// Hàm tính giờ làm thêm (dựa trên 8 giờ làm chuẩn)
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

// Hàm xử lý check-in
export const CheckIn = async (
  userId: string,
  image: Buffer,
  locationInput: InputLocationData,
  _departmentId?: string // TODO: Tạm thời không sử dụng
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
      `Lỗi khi gọi dịch vụ xác thực khuôn mặt: ${verificationError.message}`
    );
  }

  if (!isFaceMatch) {
    throw new Error("Xác thực khuôn mặt thất bại");
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

  // TODO: Tạm thời comment phần tính lương để tập trung vào chấm công nhiều lần
  // // Lấy thông tin bộ phận và mức lương
  // const departmentSalaryInfo = await getDepartmentSalaryInfo(
  //   userId,
  //   departmentId
  // );

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
    // TODO: Tạm thời bỏ qua phần department và salary để tập trung vào chấm công
    // departmentId: null,
    // hourlyRate: 0,
  };

  // Kiểm tra logic luân phiên: phải check-out trước khi check-in lần tiếp theo
  if (!attendance.checkIns) {
    attendance.checkIns = [];
  }
  if (!attendance.checkOuts) {
    attendance.checkOuts = [];
  }

  // Nếu đã có check-in nhưng chưa có check-out tương ứng → không cho check-in tiếp
  if (attendance.checkIns.length > attendance.checkOuts.length) {
    throw new Error("Bạn phải check-out trước khi check-in lần tiếp theo");
  }

  // Thêm vào mảng checkIns
  attendance.checkIns.push(newCheckInEntry);

  // Cập nhật checkIn (để backward compatibility) - lưu lần check-in đầu tiên
  if (!attendance.checkIn) {
    attendance.checkIn = newCheckInEntry;
  }

  // Tính toán dựa trên check-in đầu tiên và check-out cuối cùng (nếu có)
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

// Hàm xử lý check-out
export const CheckOut = async (
  userId: string,
  image: Buffer,
  locationInput: InputLocationData,
  _departmentId?: string // TODO: Tạm thời không sử dụng
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
      `Lỗi khi gọi dịch vụ xác thực khuôn mặt: ${verificationError.message}`
    );
  }

  if (!isFaceMatch) {
    throw new Error("Xác thực khuôn mặt thất bại");
  }

  const workDate = new Date().toISOString().split("T")[0];
  const attendance = await AttendanceModel.findOne({
    employeeId: userId,
    workDate,
  });

  if (!attendance) {
    throw new Error("Chưa có bản ghi chấm công cho hôm nay");
  }
  // Cho phép check-out nhiều lần - không cần check attendance.checkIn và attendance.checkOut

  const checkOutTime = new Date();

  // TODO: Tạm thời comment phần tính lương để tập trung vào chấm công nhiều lần
  // // Lấy thông tin bộ phận và mức lương
  // const departmentSalaryInfo = await getDepartmentSalaryInfo(
  //   userId,
  //   departmentId
  // );

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
    // TODO: Tạm thời bỏ qua phần department và salary để tập trung vào chấm công
    // departmentId: null,
    // hourlyRate: 0,
  };

  // Kiểm tra logic luân phiên: phải có check-in trước khi check-out
  if (!attendance.checkIns) {
    attendance.checkIns = [];
  }
  if (!attendance.checkOuts) {
    attendance.checkOuts = [];
  }

  // Nếu chưa có check-in hoặc số lần check-out đã bằng check-in → không cho check-out
  if (attendance.checkIns.length === 0) {
    throw new Error("Bạn phải check-in trước khi check-out");
  }

  if (attendance.checkOuts.length >= attendance.checkIns.length) {
    throw new Error(
      "Bạn đã check-out rồi, hãy check-in trước khi check-out lần tiếp theo"
    );
  }

  // Thêm vào mảng checkOuts
  attendance.checkOuts.push(newCheckOutEntry);

  // Cập nhật checkOut (để backward compatibility) - lưu lần check-out mới nhất
  attendance.checkOut = newCheckOutEntry;

  // Tính toán dựa trên check-in đầu tiên và check-out mới nhất
  const firstCheckIn =
    attendance.checkIns && attendance.checkIns.length > 0
      ? attendance.checkIns[0].time
      : attendance.checkIn?.time;

  const lastCheckOut = checkOutTime; // Check-out hiện tại là mới nhất

  if (firstCheckIn) {
    attendance.totalHours = calculateTotalHours(firstCheckIn, lastCheckOut);
    attendance.overtime = calculateOvertime(firstCheckIn, lastCheckOut);
  } else {
    // Nếu chưa có check-in, chỉ cập nhật check-out
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

// Hàm tính lương dựa trên các khoảng thời gian làm việc ở các bộ phận khác nhau
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

  // Ghép cặp check-in và check-out theo thời gian
  const workSessions: Array<{
    checkIn: any;
    checkOut: any;
    hours: number;
  }> = [];

  // Sắp xếp theo thời gian
  const sortedCheckIns = [...checkIns].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
  const sortedCheckOuts = [...checkOuts].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  // Ghép cặp check-in với check-out gần nhất sau nó
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

  // Tính lương cho từng session
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

  // Chuyển đổi Map thành array
  departmentMap.forEach((value, departmentId) => {
    departmentBreakdown.push({
      departmentId,
      hours: Math.round(value.hours * 100) / 100, // Làm tròn 2 chữ số thập phân
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

// TODO: Tạm thời comment để tập trung vào chấm công nhiều lần
// Lấy thông tin lương chi tiết cho một ngày
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
      departmentName: "Unknown Department", // Sẽ được populate từ database
    })
  );

  // Tạo thông tin chi tiết các session làm việc
  const workSessions: Array<{
    checkInTime: Date;
    checkOutTime: Date;
    departmentId: string;
    departmentName?: string;
    hours: number;
    hourlyRate: number;
    salary: number;
  }> = [];

  // Logic tương tự như trong calculateDepartmentBasedSalary nhưng trả về chi tiết sessions
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
        departmentName: "Unknown Department", // Sẽ được populate
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

  const checkInTime = attendance.checkIn?.time
    ? formatTime(new Date(attendance.checkIn.time))
    : null;
  const checkOutTime = attendance.checkOut?.time
    ? formatTime(new Date(attendance.checkOut.time))
    : "--:-- --";
  const currentTime = new Date();

  let totalHours = attendance.totalHours || "--";
  let overtime = attendance.overtime || "--";

  if (attendance.checkIn && !attendance.checkOut) {
    totalHours = calculateTotalHours(attendance.checkIn.time, currentTime);
    overtime = calculateOvertime(attendance.checkIn.time, currentTime);
  } else if (attendance.checkIn && attendance.checkOut) {
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

const formatMinutesToDuration = (totalMinutes: number): string => {
  if (totalMinutes <= 0) {
    return "0h 0m";
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60); // Làm tròn để tránh số lẻ
  return `${hours}h ${minutes}m`;
};

const getCurrentWeekRange = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  const firstDayOfWeek = new Date(today);
  // Điều chỉnh để tuần bắt đầu vào Thứ Hai
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  firstDayOfWeek.setDate(diff);

  const lastDayOfWeek = new Date(firstDayOfWeek);
  lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
  lastDayOfWeek.setHours(23, 59, 59, 999); // Kết thúc ngày Chủ Nhật

  return { start: firstDayOfWeek, end: lastDayOfWeek };
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999); // Kết thúc ngày cuối tháng

  return { start, end };
};

export const getWeekSummary = async (userId: string) => {
  const { start, end } = getCurrentWeekRange();

  // Lấy tất cả bản ghi trong tuần
  const weeklyRecords = await AttendanceModel.find({
    employeeId: userId,
    "checkIn.time": { $gte: start, $lte: end },
    status: "PRESENT", // Chỉ tính những ngày đi làm
  }).lean();

  let totalMinutes = 0;
  let overtimeMinutes = 0;
  let lateArrivals = 0;
  const standardWorkDays = 5; // Giả định tuần làm việc 5 ngày

  for (const record of weeklyRecords) {
    // Tính tổng giờ làm và giờ làm thêm
    if (record.totalHours)
      totalMinutes += parseDurationToMinutes(record.totalHours);
    if (record.overtime)
      overtimeMinutes += parseDurationToMinutes(record.overtime);

    // Kiểm tra đi trễ (ví dụ: sau 9:05 AM)
    if (record.checkIn?.time) {
      const checkInTime = new Date(record.checkIn.time);
      if (
        checkInTime.getHours() > 9 ||
        (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 5)
      ) {
        lateArrivals++;
      }
    }
  }

  const workDays = weeklyRecords.length;
  const performance = standardWorkDays > 0 ? workDays / standardWorkDays : 0;

  return {
    workDays: `${workDays} / ${standardWorkDays}`,
    totalHours: formatMinutesToDuration(totalMinutes),
    overtime: formatMinutesToDuration(overtimeMinutes),
    lateArrivals: lateArrivals,
    performance: parseFloat(performance.toFixed(2)), // trả về dạng số thập phân, vd: 0.8
  };
};

export const getMonthSummary = async (userId: string) => {
  const { start, end } = getCurrentMonthRange();

  // Đếm tổng số ngày làm việc trong tháng (bỏ T7, CN)
  let totalWorkDaysInMonth = 0;
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const dayOfWeek = day.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Không phải Chủ Nhật và T7
      totalWorkDaysInMonth++;
    }
  }

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
    workDays: `${actualWorkDays} / ${totalWorkDaysInMonth}`,
    totalHours: formatMinutesToDuration(totalMinutes),
    overtime: formatMinutesToDuration(overtimeMinutes),
    daysOff: daysOff,
  };
};

export const UploadEmployeeFace = async (
  userId: string,
  file: Buffer
): Promise<string> => {
  const user = await User.findById(userId);
  if (!user || user.isdeleted || user.isdisable) {
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND);
  }

  // Lấy public_id của ảnh cũ nếu có
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

  // Cập nhật URL ảnh mới
  user.referenceImageUrl = imageUrl;
  await user.save();
  return imageUrl;
};

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
 * Lấy lịch sử chấm công có phân trang cho một nhân viên.
 * @param userId ID của nhân viên
 * @param page Số trang hiện tại (mặc định 1)
 * @param limit Số lượng bản ghi trên mỗi trang (mặc định 10)
 * @returns Một đối tượng chứa danh sách lịch sử và thông tin phân trang
 */
export const getAttendanceHistory = async (
  userId: string,
  page: number = 1,
  limit: number = 10
) => {
  const skip = (page - 1) * limit;

  const records = await AttendanceModel.find({
    employeeId: userId,
    status: "PRESENT", // Chỉ lấy những ngày đi làm
  })
    .sort({ workDate: -1 }) // Sắp xếp giảm dần theo ngày
    .skip(skip)
    .limit(limit)
    .lean(); // .lean() để tăng hiệu suất và trả về plain JS objects

  // Lấy tổng số bản ghi để tính tổng số trang
  const totalRecords = await AttendanceModel.countDocuments({
    employeeId: userId,
    status: "PRESENT",
  });

  const formattedHistory = records.map((record) => {
    const workDate = new Date(record.workDate);
    // Format ngày thành dạng "Tháng Ngày", ví dụ "June 24"
    const dateFormatted = workDate.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
    });

    return {
      id: record._id.toString(),
      date: dateFormatted,
      checkIn: formatTimeToAMPM(record.checkIn?.time),
      checkOut: formatTimeToAMPM(record.checkOut?.time),
      totalHours: record.totalHours || "--",
    };
  });

  return {
    history: formattedHistory,
    currentPage: page,
    totalPages: Math.ceil(totalRecords / limit),
    totalRecords: totalRecords,
  };
};

export const getMonthlyDetails = async (
  userId: string,
  year: number,
  month: number
) => {
  // 1. Lấy tất cả các bản ghi chấm công của tháng từ DB
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
    const currentDate = new Date(year, month - 1, day);
    const workDateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    const dayOfWeek = currentDate.getDay(); // 0:Sun, 6:Sat

    const record = recordsMap.get(workDateStr);

    let dayInfo = {
      date: currentDate.toISOString(), // Định dạng ISO để Flutter dễ parse
      status: "Absent",
      checkIn: "--:--",
      checkOut: "--:--",
      totalHours: "--",
      overtime: "--",
    };

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      dayInfo.status = "Weekend";
    } else if (record) {
      dayInfo.totalHours = record.totalHours || "--";
      dayInfo.overtime = record.overtime || "--";
      dayInfo.checkIn = formatTimeToAMPM(record.checkIn?.time);
      dayInfo.checkOut = formatTimeToAMPM(record.checkOut?.time);

      if (record.status === "ON_LEAVE") {
        dayInfo.status = "On Leave"; // Trùng với Days Off trong UI trước
      } else if (record.status === "PRESENT") {
        dayInfo.status = "On Time";
        summary.workDays++;

        // Logic kiểm tra đi trễ (ví dụ: sau 9:05 AM)
        if (record.checkIn?.time) {
          const checkInTime = new Date(record.checkIn.time);
          if (
            checkInTime.getHours() > 9 ||
            (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 5)
          ) {
            dayInfo.status = "Late";
            summary.lateArrivals++;
          }
        }
      }
    } else {
      // Không phải cuối tuần và không có bản ghi -> Vắng
      summary.absences++;
    }

    dailyDetails.push(dayInfo);
  }

  return {
    dailyDetails, // Dữ liệu cho lịch
    summary, // Dữ liệu cho card tổng kết cuối trang
  };
};
