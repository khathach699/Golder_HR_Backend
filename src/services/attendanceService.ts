import { Document } from 'mongoose';
import AttendanceModel from '../models/attendance';
import User from '../models/user';
import { uploadToCloudinary } from '../utils/cloudinary';
import { verifyFace } from '../utils/faceVerification';
import { AUTH_ERRORS } from '../utils/constants';
import { AttendanceDocument } from '../types/attendance';

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

  // Tải ảnh lên Cloudinary
  const imageUrl = await uploadToCloudinary(image, 'attendance_images');

  // Xác thực khuôn mặt
  const isFaceMatch = await verifyFace(imageUrl, user.referenceImageUrl as string);
  if (!isFaceMatch) {
    throw new Error('Xác thực khuôn mặt thất bại');
  }

  // Lấy ngày hiện tại (YYYY-MM-DD)
  const workDate = new Date().toISOString().split('T')[0];

  // Tìm hoặc tạo bản ghi chấm công
  let attendance = await AttendanceModel.findOne({ employeeId: userId, workDate });
  if (!attendance) {
    attendance = new AttendanceModel({
      employeeId: userId,
      workDate,
      status: 'PRESENT',
    });
  } else if (attendance.checkIn) {
    throw new Error('Đã chấm công vào hôm nay');
  }

  // Cập nhật thông tin chấm công vào
  attendance.checkIn = {
    time: new Date(),
    imageUrl,
    location: {
      coordinates: {
        type: 'Point',
        coordinates: location.coordinates,
      },
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

  // Tải ảnh lên Cloudinary
  const imageUrl = await uploadToCloudinary(image, 'attendance_images');

  // Xác thực khuôn mặt
  const isFaceMatch = await verifyFace(imageUrl, user.referenceImageUrl as string);
  if (!isFaceMatch) {
    throw new Error('Xác thực khuôn mặt thất bại');
  }

  // Lấy ngày hiện tại (YYYY-MM-DD)
  const workDate = new Date().toISOString().split('T')[0];

  // Tìm bản ghi chấm công
  const attendance = await AttendanceModel.findOne({ employeeId: userId, workDate });
  if (!attendance || !attendance.checkIn) {
    throw new Error('Chưa chấm công vào hôm nay');
  }
  if (attendance.checkOut) {
    throw new Error('Đã chấm công ra hôm nay');
  }

  // Cập nhật thông tin chấm công ra
  attendance.checkOut = {
    time: new Date(),
    imageUrl,
    location: {
      coordinates: {
        type: 'Point',
        coordinates: location.coordinates,
      },
      address: location.address,
    },
  };

  await attendance.save();
  return attendance as AttendanceDocument;
};