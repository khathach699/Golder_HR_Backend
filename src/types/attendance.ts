import { Document, Types } from "mongoose";

export interface Location {
  coordinates: { type: string; coordinates: [number, number] };
  address: string;
}

export interface AttendanceEntry {
  time: Date;
  imageUrl: string;
  location: Location;
}

export interface AttendanceDocument extends Document {
  employeeId: Types.ObjectId;
  workDate: string;
  checkIn?: AttendanceEntry;
  checkOut?: AttendanceEntry;
  status: "PRESENT" | "ON_LEAVE";
  createdAt: Date;
  updatedAt: Date;
  totalHours?: string;
  overtime?: string;
}
