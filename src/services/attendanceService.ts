// // File: src/services/attendanceService.ts
// import { Document } from 'mongoose';
// import AttendanceModel from '../models/attendance';
// import User from '../models/user';
// import { uploadToCloudinary } from '../utils/cloudinary';
// import { verifyFace } from '../utils/faceVerification';
// import { AUTH_ERRORS } from '../utils/constants';
// import { Attendance, AttendanceDocument } from '../types/attendance';

// interface Location {
//   coordinates: [number, number]; // [longitude, latitude]
//   address: string;
// }

// export const CheckIn = async (
//   userId: string,
//   image: Buffer,
//   location: Location
// ): Promise<AttendanceDocument> => {
//   const user = await User.findById(userId);
//   if (!user || !user.referenceImageUrl) {
//     throw new Error(AUTH_ERRORS.USER_NOT_FOUND_OR_NO_REFERENCE_IMAGE);
//   }

//   // Upload captured image to Cloudinary
//   const imageUrl = await uploadToCloudinary(image, 'attendance_images');

//   // Verify face
//   const isFaceMatch = await verifyFace(imageUrl, user.referenceImageUrl as string); // Cast if necessary
//   if (!isFaceMatch) {
//     throw new Error('Face verification failed');
//   }

//   // Get current date in YYYY-MM-DD format
//   const workDate = new Date().toISOString().split('T')[0];

//   // Find or create attendance record
//   let attendance = await AttendanceModel.findOne({ employeeId: userId, workDate });
//   if (!attendance) {
//     attendance = new AttendanceModel({
//       employeeId: userId,
//       workDate,
//       status: 'PRESENT',
//     });
//   }

//   // Update check-in
//   attendance.checkIn = {
//     time: new Date(),
//     imageUrl,
//     location: {
//       coordinates: {
//         type: 'Point',
//         coordinates: location.coordinates,
//       },
//       address: location.address,
//     },
//   };

//   await attendance.save();
//   return attendance as AttendanceDocument;
// };

// export const CheckOut = async (
//   userId: string,
//   image: Buffer,
//   location: Location
// ): Promise<AttendanceDocument> => {
//   const user = await User.findById(userId);
//   if (!user || !user.referenceImageUrl) {
//     throw new Error(AUTH_ERRORS.USER_NOT_FOUND_OR_NO_REFERENCE_IMAGE);
//   }

//   // Upload captured image to Cloudinary
//   const imageUrl = await uploadToCloudinary(image, 'attendance_images');

//   // Verify face
//   const isFaceMatch = await verifyFace(imageUrl, user.referenceImageUrl as string); // Cast if necessary
//   if (!isFaceMatch) {
//     throw new Error('Face verification failed');
//   }

//   // Get current date in YYYY-MM-DD format
//   const workDate = new Date().toISOString().split('T')[0];

//   // Find attendance record
//   const attendance = await AttendanceModel.findOne({ employeeId: userId, workDate });
//   if (!attendance) {
//     throw new Error('No check-in record found for today');
//   }

//   // Update check-out
//   attendance.checkOut = {
//     time: new Date(),
//     imageUrl,
//     location: {
//       coordinates: {
//         type: 'Point',
//         coordinates: location.coordinates,
//       },
//       address: location.address,
//     },
//   };

//   await attendance.save();
//   return attendance as AttendanceDocument;
// };