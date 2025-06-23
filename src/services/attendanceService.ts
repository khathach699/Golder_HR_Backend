import { Document } from "mongoose";
import AttendanceModel from "../models/attendance";
import User from "../models/user";
import { v2 as cloudinary } from "cloudinary";
import { uploadToCloudinary } from "../utils/cloudinary";
import { verifyFace } from "../utils/faceVerification";
import { AUTH_ERRORS } from "../utils/constants";
import { AttendanceDocument } from "../types/attendance";

interface Location {
  coordinates: [number, number]; // [kinh độ, vĩ độ]
  address: string;
}

export const CheckIn = async (
  userId: string,
  image: Buffer,
  location: Location
): Promise<AttendanceDocument> => {
  const user = await User.findById(userId);
  if (!user || !user.referenceImageUrl) {
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND_OR_NO_REFERENCE_IMAGE);
  }

  const imageUrl = await uploadToCloudinary(image, "attendance_images");
  const isFaceMatch = await verifyFace(
    imageUrl,
    user.referenceImageUrl as string
  );
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
    });
  } else if (attendance.checkIn) {
    throw new Error("Đã chấm công vào hôm nay");
  }

  attendance.checkIn = {
    time: new Date(),
    imageUrl,
    location: {
      coordinates: { type: "Point", coordinates: location.coordinates },
      address: location.address,
    },
  };

  await attendance.save();
  return attendance as AttendanceDocument;
};

export const CheckOut = async (
  userId: string,
  image: Buffer,
  location: Location
): Promise<AttendanceDocument> => {
  const user = await User.findById(userId);
  if (!user || !user.referenceImageUrl) {
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND_OR_NO_REFERENCE_IMAGE);
  }

  const imageUrl = await uploadToCloudinary(image, "attendance_images");
  const isFaceMatch = await verifyFace(imageUrl, user.referenceImageUrl);
  if (!isFaceMatch) {
    throw new Error("Xác thực khuôn mặt thất bại");
  }

  const workDate = new Date().toISOString().split("T")[0];

  const attendance = await AttendanceModel.findOne({
    employeeId: userId,
    workDate,
  });
  if (!attendance || !attendance.checkIn) {
    throw new Error("Chưa chấm công vào hôm nay");
  }
  if (attendance.checkOut) {
    throw new Error("Đã chấm công ra hôm nay");
  }

  attendance.checkOut = {
    time: new Date(),
    imageUrl,
    location: {
      coordinates: {
        type: "Point",
        coordinates: location.coordinates,
      },
      address: location.address,
    },
  };

  await attendance.save();
  return attendance as AttendanceDocument;
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
