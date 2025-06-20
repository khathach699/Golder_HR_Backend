// File: src/services/authService.ts

import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import User from "../models/user";
import Role from "../models/role";
import { AUTH_ERRORS } from '../utils/constants';
import { sendMailForgotPassword } from '../utils/mailer'; // Đảm bảo bạn đã có file này
import { uploadToCloudinary } from '../utils/cloudinary';

// === HÀM LẤY DỮ LIỆU ===
export const GetUserByID = async (id: string) => {
  const user = await User.findById(id).populate("role");
  if (!user || user.isdeleted || user.isdisable) {
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND);
  }
  return user;
};

// === HÀM XỬ LÝ NGHIỆP VỤ ===

export const CreateAnUser = async (email: string, password: string, fullname: string, role: string) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error(AUTH_ERRORS.EMAIL_ALREADY_EXISTS);
  }

  const roleObj = await Role.findOne({ name: role });
  if (!roleObj) {
    throw new Error(AUTH_ERRORS.ROLE_NOT_FOUND);
  }

  const newUser = new User({
    email,
    password,
    fullname,
    role: roleObj._id,
  });
  return await newUser.save();
};

export const CheckLogin = async (email: string, password: string) => {
  const user = await User.findOne({ email }).select('+password').populate('role');
  if (!user || user.isdeleted || user.isdisable) {
    throw new Error(AUTH_ERRORS.EMAIL_OR_PASSWORD_WRONG);
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    throw new Error(AUTH_ERRORS.EMAIL_OR_PASSWORD_WRONG);
  }

  user.password = undefined!;
  return user;
};

export const ForgotPassword = async (email: string) => {
  const user = await User.findOne({ email });
  if (user && !user.isdeleted) {
    // Sửa OTP thành 4 chữ số theo yêu cầu
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); 
    user.otpCode = otp;
    user.otpExpires = Date.now() + 600000; // 10 phút

    await user.save({ validateBeforeSave: false });
    await sendMailForgotPassword(user.email, otp);
  }
  // Không làm gì nếu không tìm thấy user để bảo mật
};

const GetUserByOtp = async(otp: string) => {
    return await User.findOne({ otpCode: otp });
}

export const VerifyOtpAndGenerateResetToken = async (otp: string): Promise<string> => {
  const user = await GetUserByOtp(otp);

  if (!user || !user.otpExpires || Date.now() > user.otpExpires) {
    throw new Error(AUTH_ERRORS.OTP_EXPIRED_OR_INVALID);
  }

  user.otpCode = undefined;
  user.otpExpires = undefined;
  await user.save({ validateBeforeSave: false });

  const resetToken = jwt.sign(
    { id: user._id, type: 'PASSWORD_RESET' },
    process.env.JWT_SECRET!,
    { expiresIn: '10m' }
  );
  return resetToken;
};

export const ResetPasswordWithToken = async (resetToken: string, newPassword: string) => {
  try {
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET!) as { id: string; type: string };
    if (decoded.type !== 'PASSWORD_RESET') {
      throw new Error('Invalid Token Purpose');
    }
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new Error(AUTH_ERRORS.USER_NOT_FOUND);
    }
    user.password = newPassword;
    await user.save();
  } catch (error) {
    throw new Error(AUTH_ERRORS.INVALID_OR_EXPIRED_TOKEN);
  }
};

export const ChangePassword = async (userId: string, oldPassword: string, newPassword: string) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND);
  }

  const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isPasswordMatch) {
    throw new Error(AUTH_ERRORS.WRONG_PASSWORD);
  }
  
  user.password = newPassword;
  await user.save();
};

export const UploadEmployeeFace = async (userId: string, file: Buffer): Promise<string> => {
  const user = await User.findById(userId);
  if (!user || user.isdeleted || user.isdisable) {
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND);
  }

  const imageUrl = await uploadToCloudinary(file, 'employee_faces');
  user.referenceImageUrl = imageUrl;
  await user.save();
  return imageUrl;
};