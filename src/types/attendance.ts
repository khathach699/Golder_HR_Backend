// src/types/attendance.ts
import { Document } from "mongoose"; // Thêm import Document

// Dữ liệu location đơn giản nhận từ controller
export interface InputLocationData {
  coordinates: [number, number]; // [longitude, latitude]
  address: string;
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
  location: DBLocationData; // Sử dụng DBLocationData
}

export interface AttendanceDocument extends Document {
  // extends Document từ mongoose
  _id: any; // Hoặc mongoose.Schema.Types.ObjectId
  employeeId: any; // Hoặc mongoose.Schema.Types.ObjectId, ref: "User"
  workDate: string;
  checkIn?: AttendanceEntry;
  checkOut?: AttendanceEntry;
  status: "PRESENT" | "ON_LEAVE";
  totalHours: string;
  overtime: string;
  createdAt?: Date;
  updatedAt?: Date;
}
