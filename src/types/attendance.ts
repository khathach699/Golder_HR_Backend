// src/types/attendance.ts
import { Document } from "mongoose"; // Thêm import Document

// Dữ liệu location đơn giản nhận từ controller
export interface InputLocationData {
  coordinates: [number, number]; // [longitude, latitude]
  address: string;
}

// Dữ liệu đầu vào cho check-in/check-out với thông tin bộ phận
export interface CheckInOutInput {
  location: InputLocationData;
  departmentId?: string; // ID bộ phận (optional, sẽ dùng default nếu không có)
}

// Cấu trúc location phức tạp hơn được lưu trong DB (theo locationSchema)
export interface DBLocationData {
  address: string;
  coordinates: {
    type: "Point"; // Literal type "Point"
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface AttendanceEntry {
  time: Date;
  imageUrl: string;
  location: DBLocationData;
  // TODO: Tạm thời làm optional để tập trung vào chấm công nhiều lần
  departmentId?: any; // ID bộ phận mà nhân viên đang làm việc (optional)
  hourlyRate?: number; // Mức lương theo giờ tại thời điểm check-in/out (optional)
}

export interface AttendanceDocument extends Document {
  _id: any;
  employeeId: any;
  workDate: string;
  // Thêm mảng để hỗ trợ nhiều lần check-in/check-out
  checkIns?: AttendanceEntry[];
  checkOuts?: AttendanceEntry[];
  // Giữ lại để backward compatibility
  checkIn?: AttendanceEntry;
  checkOut?: AttendanceEntry;
  status: "PRESENT" | "ON_LEAVE";
  totalHours: string;
  overtime: string;
  createdAt?: Date;
  updatedAt?: Date;
  IdMapper: number;
  CodeMapper: string;
}
