// services/attendanceService.ts
import { Document } from "mongoose";
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

// ... (other functions are fine) ...

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
export const CheckIn = async (
  userId: string,
  image: Buffer,
  locationInput: InputLocationData // locationInput là dữ liệu từ controller: { coordinates: [lng, lat], address: "..."}
): Promise<AttendanceDocument> => {
  console.log(`[SERVICE CheckIn] Started for userId: ${userId}`);
  console.log(
    `[SERVICE CheckIn] Received locationInput:`,
    JSON.stringify(locationInput, null, 2)
  );

  const user = await User.findById(userId);
  if (!user || !user.referenceImageUrl) {
    console.error(
      `[SERVICE CheckIn] User not found or no reference image for userId: ${userId}`
    );
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND_OR_NO_REFERENCE_IMAGE);
  }
  console.log(
    `[SERVICE CheckIn] User found: ${
      user.fullname
    }, Ref Img URL exists: ${!!user.referenceImageUrl}`
  );

  console.log(`[SERVICE CheckIn] Uploading image to Cloudinary...`);
  const imageUrl = await uploadToCloudinary(image, "attendance_images");
  console.log(`[SERVICE CheckIn] Image uploaded, URL: ${imageUrl}`);

  let isFaceMatch = false;
  try {
    console.log(
      `[SERVICE CheckIn] Verifying face against reference: ${user.referenceImageUrl}`
    );
    isFaceMatch = await verifyFace(imageUrl, user.referenceImageUrl as string);
    console.log(`[SERVICE CheckIn] Face verification result: ${isFaceMatch}`);
  } catch (verificationError: any) {
    console.error(
      `[SERVICE CheckIn] Error during face verification call:`,
      verificationError.message
    );
    if (verificationError.response && verificationError.response.data) {
      console.error(
        "[SERVICE CheckIn] Error response data from face verification service:",
        verificationError.response.data
      );
    }
    throw new Error(
      `Lỗi khi gọi dịch vụ xác thực khuôn mặt: ${verificationError.message}`
    );
  }

  if (!isFaceMatch) {
    console.error(`[SERVICE CheckIn] Face verification failed.`);
    throw new Error("Xác thực khuôn mặt thất bại");
  }

  const workDate = new Date().toISOString().split("T")[0];
  console.log(`[SERVICE CheckIn] Work date: ${workDate}`);
  let attendance = await AttendanceModel.findOne({
    employeeId: userId,
    workDate,
  });

  if (!attendance) {
    console.log(
      `[SERVICE CheckIn] No existing attendance record for today. Creating new one.`
    );
    attendance = new AttendanceModel({
      employeeId: userId,
      workDate,
      status: "PRESENT",
    });
  } else if (attendance.checkIn) {
    console.error(
      `[SERVICE CheckIn] User already checked in today. Current checkIn time:`,
      attendance.checkIn.time
    );
    throw new Error("Đã chấm công vào hôm nay");
  } else {
    console.log(
      `[SERVICE CheckIn] Found existing attendance record for today without check-in. Updating it.`
    );
  }

  const checkInTime = new Date();
  console.log(`[SERVICE CheckIn] Check-in time: ${checkInTime.toISOString()}`);

  const locationForDb: DBLocationData = {
    address: locationInput.address,
    coordinates: {
      type: "Point" as const,
      coordinates: locationInput.coordinates,
    },
  };
  console.log(
    `[SERVICE CheckIn] Prepared locationForDb (to be saved):`,
    JSON.stringify(locationForDb, null, 2)
  );

  attendance.checkIn = {
    time: checkInTime,
    imageUrl,
    location: locationForDb, // QUAN TRỌNG: Gán 'locationForDb' đã định dạng đúng vào đây
  };
  // ----- KẾT THÚC PHẦN SỬA -----

  attendance.totalHours = calculateTotalHours(checkInTime, undefined); // Sẽ là "--"
  attendance.overtime = calculateOvertime(checkInTime, undefined); // Sẽ là "--"
  console.log(
    `[SERVICE CheckIn] Tentative totalHours: ${attendance.totalHours}, overtime: ${attendance.overtime}`
  );

  console.log("[SERVICE CheckIn] Attempting to save attendance record...");
  console.log(
    "[SERVICE CheckIn] Full attendance object before save:",
    JSON.stringify(attendance.toObject(), null, 2)
  );

  try {
    await attendance.save();
    console.log(
      "[SERVICE CheckIn] Attendance record saved successfully. ID:",
      attendance._id
    );
  } catch (dbError: any) {
    console.error("[SERVICE CheckIn] !!! DB SAVE ERROR !!!:", dbError.message);
    if (dbError.errors) {
      console.error(
        "[SERVICE CheckIn] Mongoose Validation Errors:",
        JSON.stringify(dbError.errors, null, 2)
      );
    } else {
      console.error("[SERVICE CheckIn] DB Error Stack:", dbError.stack);
    }
    throw dbError; // Ném lại lỗi để controller bắt
  }

  return attendance as AttendanceDocument;
};

// Hàm xử lý check-out (ĐÃ SỬA)
export const CheckOut = async (
  userId: string,
  image: Buffer,
  locationInput: InputLocationData // locationInput là dữ liệu từ controller: { coordinates: [lng, lat], address: "..."}
): Promise<AttendanceDocument> => {
  console.log(`[SERVICE CheckOut] Started for userId: ${userId}`);
  console.log(
    `[SERVICE CheckOut] Received locationInput:`,
    JSON.stringify(locationInput, null, 2)
  );

  const user = await User.findById(userId);
  if (!user || !user.referenceImageUrl) {
    console.error(
      `[SERVICE CheckOut] User not found or no reference image for userId: ${userId}`
    );
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND_OR_NO_REFERENCE_IMAGE);
  }
  console.log(
    `[SERVICE CheckOut] User found: ${
      user.fullname
    }, Ref Img URL exists: ${!!user.referenceImageUrl}`
  );

  console.log(`[SERVICE CheckOut] Uploading image to Cloudinary...`);
  const imageUrl = await uploadToCloudinary(image, "attendance_images");
  console.log(`[SERVICE CheckOut] Image uploaded, URL: ${imageUrl}`);

  let isFaceMatch = false;
  try {
    console.log(
      `[SERVICE CheckOut] Verifying face against reference: ${user.referenceImageUrl}`
    );
    isFaceMatch = await verifyFace(imageUrl, user.referenceImageUrl as string);
    console.log(`[SERVICE CheckOut] Face verification result: ${isFaceMatch}`);
  } catch (verificationError: any) {
    console.error(
      `[SERVICE CheckOut] Error during face verification call:`,
      verificationError.message
    );
    if (verificationError.response && verificationError.response.data) {
      console.error(
        "[SERVICE CheckOut] Error response data from face verification service:",
        verificationError.response.data
      );
    }
    throw new Error(
      `Lỗi khi gọi dịch vụ xác thực khuôn mặt: ${verificationError.message}`
    );
  }

  if (!isFaceMatch) {
    console.error(`[SERVICE CheckOut] Face verification failed.`);
    throw new Error("Xác thực khuôn mặt thất bại");
  }

  const workDate = new Date().toISOString().split("T")[0];
  console.log(`[SERVICE CheckOut] Work date: ${workDate}`);
  const attendance = await AttendanceModel.findOne({
    employeeId: userId,
    workDate,
  });

  if (!attendance || !attendance.checkIn) {
    console.error(
      `[SERVICE CheckOut] No check-in found for today or attendance record does not exist.`
    );
    throw new Error("Chưa chấm công vào hôm nay");
  }
  if (attendance.checkOut) {
    console.error(
      `[SERVICE CheckOut] User already checked out today. Current checkOut time:`,
      attendance.checkOut.time
    );
    throw new Error("Đã chấm công ra hôm nay");
  }
  console.log(
    `[SERVICE CheckOut] Found existing attendance record for today with check-in. Updating with check-out.`
  );

  const checkOutTime = new Date();
  console.log(
    `[SERVICE CheckOut] Check-out time: ${checkOutTime.toISOString()}`
  );

  // ----- BẮT ĐẦU PHẦN SỬA -----
  // Tạo đối tượng location phù hợp với Mongoose Schema (GeoJSON Point structure)
  const locationForDb: DBLocationData = {
    address: locationInput.address, // Lấy địa chỉ từ đầu vào
    coordinates: {
      // Tạo object 'coordinates'
      type: "Point" as const, // Theo schema, trường 'type' có giá trị 'Point'
      coordinates: locationInput.coordinates, // Lấy mảng [kinh_do, vi_do] từ đầu vào
      // và đặt nó vào trường 'coordinates' bên trong này
    },
  };
  console.log(
    `[SERVICE CheckOut] Prepared locationForDb (to be saved):`,
    JSON.stringify(locationForDb, null, 2)
  );

  attendance.checkOut = {
    time: checkOutTime,
    imageUrl,
    location: locationForDb, // QUAN TRỌNG: Gán 'locationForDb' đã định dạng đúng vào đây
  };
  // ----- KẾT THÚC PHẦN SỬA -----

  // Tính lại totalHours và overtime
  if (attendance.checkIn?.time) {
    // Cần kiểm tra checkIn.time tồn tại
    attendance.totalHours = calculateTotalHours(
      attendance.checkIn.time,
      checkOutTime
    );
    attendance.overtime = calculateOvertime(
      attendance.checkIn.time,
      checkOutTime
    );
  } else {
    // Trường hợp này không nên xảy ra nếu logic ở trên đúng
    attendance.totalHours = "--";
    attendance.overtime = "--";
    console.warn(
      "[SERVICE CheckOut] Warning: checkIn.time was undefined when calculating total/overtime for checkout."
    );
  }
  console.log(
    `[SERVICE CheckOut] Calculated totalHours: ${attendance.totalHours}, overtime: ${attendance.overtime}`
  );

  console.log("[SERVICE CheckOut] Attempting to save attendance record...");
  console.log(
    "[SERVICE CheckOut] Full attendance object before save:",
    JSON.stringify(attendance.toObject(), null, 2)
  );

  try {
    await attendance.save();
    console.log(
      "[SERVICE CheckOut] Attendance record saved successfully. ID:",
      attendance._id
    );
  } catch (dbError: any) {
    console.error("[SERVICE CheckOut] !!! DB SAVE ERROR !!!:", dbError.message);
    if (dbError.errors) {
      console.error(
        "[SERVICE CheckOut] Mongoose Validation Errors:",
        JSON.stringify(dbError.errors, null, 2)
      );
    } else {
      console.error("[SERVICE CheckOut] DB Error Stack:", dbError.stack);
    }
    throw dbError;
  }

  return attendance as AttendanceDocument;
};

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

  // Tải ảnh mới lên Cloudinary
  const imageUrl = await uploadToCloudinary(file, "employee_faces");

  // Xóa ảnh cũ nếu có
  if (oldPublicId) {
    try {
      await cloudinary.uploader.destroy(oldPublicId);
      console.log(`Đã xóa ảnh cũ: ${oldPublicId}`);
    } catch (error) {
      console.warn(`Không thể xóa ảnh cũ ${oldPublicId}:`, error);
    }
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

  // Truy vấn dữ liệu có phân trang và sắp xếp theo ngày làm việc mới nhất
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

  // Định dạng lại dữ liệu trả về cho phù hợp với UI
  const formattedHistory = records.map((record) => {
    const workDate = new Date(record.workDate);
    // Format ngày thành dạng "Tháng Ngày", ví dụ "June 24"
    const dateFormatted = workDate.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
    });

    return {
      // Có thể thêm id của record nếu cần key trong Flutter list
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

  // Chuyển đổi thành một Map để truy cập nhanh bằng 'YYYY-MM-DD'
  const recordsMap = new Map(recordsOfMonth.map((r) => [r.workDate, r]));

  // Khởi tạo các biến để tóm tắt tháng
  let summary = {
    workDays: 0,
    lateArrivals: 0,
    absences: 0,
    holidays: 0, // Logic cho holiday có thể cần nguồn dữ liệu riêng
  };

  const daysInMonth = endDate.getDate();
  const dailyDetails = [];

  // 2. Lặp qua tất cả các ngày trong tháng để tạo cấu trúc dữ liệu hoàn chỉnh
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
