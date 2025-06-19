import { IUserDocument } from "./user";

export interface Attendance {
    user: IUserDocument['_id'];
    checkInTime?: Date;
    checkOutTime?: Date;
    faceVerification: boolean;
    status: "pending" | "approved" | "rejected";
    imageUrl?: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}