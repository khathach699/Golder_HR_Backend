// File: src/types/user.ts
import { Document } from "mongoose";

export interface IUser {
  fullname: string;
  email: string;
  password: string;
  avatar?: string;
  point?: number;
  isdisable?: boolean;
  referenceImageUrl?: string;
  role: string | { name: string };
  organization?: string;
  otpCode?: string;
  otpExpires?: number;
  isdeleted?: boolean;
  IdMapper?: number;
  CodeMapper?: string;
}

export interface IUserDocument extends IUser, Document {}
