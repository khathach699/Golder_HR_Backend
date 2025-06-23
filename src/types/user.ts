// File: src/types/user.ts
import { Document } from "mongoose";

export interface IUser {
  fullname: string;
  email: string;
  password: string;
  avatar?: string;
  point?: number;
  isdisable?: boolean;
  referenceImageUrl?: string; // Changed from String to string
  role: string | { name: string };
  organization?: string;
  otpCode?: string;
  otpExpires?: number;
  isdeleted?: boolean;
}

export interface IUserDocument extends IUser, Document {}
