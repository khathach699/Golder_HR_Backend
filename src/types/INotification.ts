// // Filename: INotification.ts

// import mongoose, { Document } from "mongoose";

// export interface INotification extends Document {
//   _id: mongoose.Types.ObjectId;
//   title: string;
//   message: string;
//   type:
//     | "system"
//     | "attendance"
//     | "leave"
//     | "announcement"
//     | "reminder"
//     | "custom"
//     | "overtime"
//     | "submitLeaveRequest"
//     | "approveLeaveRequest"
//     | "rejectLeaveRequest";
//   priority: "low" | "medium" | "high" | "urgent";
//   recipients: {
//     userId: mongoose.Types.ObjectId;
//     isRead: boolean;
//     readAt?: Date;
//   }[];
//   sender?: mongoose.Types.ObjectId; // User who sent the notification
//   data?: { [key: string]: any }; // Additional data for the notification
//   scheduledAt?: Date; // For scheduled notifications
//   expiresAt?: Date; // When notification expires
//   isActive: boolean;
//   createdAt: Date;
//   updatedAt: Date;
// }
