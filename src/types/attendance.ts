import { Document } from "mongoose";

export interface InputLocationData {
  coordinates: [number, number];
  address: string;
}

export interface CheckInOutInput {
  location: InputLocationData;
  departmentId?: string;
}

export interface DBLocationData {
  address: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
}

export interface AttendanceEntry {
  time: Date;
  imageUrl: string;
  location: DBLocationData;
  departmentId?: any;
  hourlyRate?: number;
}

export interface AttendanceDocument extends Document {
  _id: any;
  employeeId: any;
  workDate: string;
  checkIns?: AttendanceEntry[];
  checkOuts?: AttendanceEntry[];
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
