// models/attendance.model.js
import { Schema, model } from "mongoose";

const locationSchema = new Schema({
    // Dành cho MÁY TÍNH: Vẽ bản đồ, tính toán
    coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true } // [kinh độ, vĩ độ]
    },
    // Dành cho CON NGƯỜI: Hiển thị cho dễ đọc
    address: { 
        type: String,
        required: true
    }
}, { _id: false }); // Không cần _id cho sub-document này

const attendanceEntrySchema = new Schema({
    time: { type: Date, required: true },
    imageUrl: { type: String, required: true }, // URL ảnh từ Cloudinary
    location: { type: locationSchema, required: true }
}, { _id: false });

const attendanceSchema = new Schema({
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    workDate: { type: String, required: true, index: true }, // 'YYYY-MM-DD'
    checkIn: { type: attendanceEntrySchema },
    checkOut: { type: attendanceEntrySchema },
    status: {
        type: String,
        enum: ["PRESENT", "ON_LEAVE"], // Bỏ ABSENT vì không check-in nghĩa là absent
        default: "PRESENT"
    },
}, { timestamps: true });

// Index để đảm bảo 1 người 1 bản ghi/ngày và tìm kiếm nhanh
attendanceSchema.index({ employeeId: 1, workDate: 1 }, { unique: true });

export default model("Attendance", attendanceSchema);