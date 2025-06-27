"use strict";
// File: src/services/authService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadUserAvatar = exports.UpdateUserProfile = exports.GetUserProfile = exports.ChangePassword = exports.ResetPasswordWithToken = exports.VerifyOtpAndGenerateResetToken = exports.ForgotPassword = exports.CheckLogin = exports.CreateAnUser = exports.GetUserByID = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_1 = __importDefault(require("../models/user"));
const role_1 = __importDefault(require("../models/role"));
const constants_1 = require("../utils/constants");
const mailer_1 = require("../utils/mailer"); // Đảm bảo bạn đã có file này
const cloudinary_1 = require("../utils/cloudinary");
// === HÀM LẤY DỮ LIỆU ===
const GetUserByID = async (id) => {
    const user = await user_1.default.findById(id).populate("role");
    if (!user || user.isdeleted || user.isdisable) {
        throw new Error(constants_1.AUTH_ERRORS.USER_NOT_FOUND);
    }
    return user;
};
exports.GetUserByID = GetUserByID;
// === HÀM XỬ LÝ NGHIỆP VỤ ===
const CreateAnUser = async (email, password, fullname, role) => {
    const existingUser = await user_1.default.findOne({ email });
    if (existingUser) {
        throw new Error(constants_1.AUTH_ERRORS.EMAIL_ALREADY_EXISTS);
    }
    const roleObj = await role_1.default.findOne({ name: role });
    if (!roleObj) {
        throw new Error(constants_1.AUTH_ERRORS.ROLE_NOT_FOUND);
    }
    const newUser = new user_1.default({
        email,
        password,
        fullname,
        role: roleObj._id,
    });
    return await newUser.save();
};
exports.CreateAnUser = CreateAnUser;
const CheckLogin = async (email, password) => {
    const user = await user_1.default.findOne({ email })
        .select("+password")
        .populate("role");
    if (!user || user.isdeleted || user.isdisable) {
        throw new Error(constants_1.AUTH_ERRORS.EMAIL_OR_PASSWORD_WRONG);
    }
    const isPasswordMatch = await bcrypt_1.default.compare(password, user.password);
    if (!isPasswordMatch) {
        throw new Error(constants_1.AUTH_ERRORS.EMAIL_OR_PASSWORD_WRONG);
    }
    user.password = undefined;
    return user;
};
exports.CheckLogin = CheckLogin;
const ForgotPassword = async (email) => {
    const user = await user_1.default.findOne({ email });
    if (user && !user.isdeleted) {
        // Sửa OTP thành 4 chữ số theo yêu cầu
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        user.otpCode = otp;
        user.otpExpires = Date.now() + 600000; // 10 phút
        await user.save({ validateBeforeSave: false });
        await (0, mailer_1.sendMailForgotPassword)(user.email, otp);
    }
    // Không làm gì nếu không tìm thấy user để bảo mật
};
exports.ForgotPassword = ForgotPassword;
const GetUserByOtp = async (otp) => {
    return await user_1.default.findOne({ otpCode: otp });
};
const VerifyOtpAndGenerateResetToken = async (otp) => {
    const user = await GetUserByOtp(otp);
    if (!user || !user.otpExpires || Date.now() > user.otpExpires) {
        throw new Error(constants_1.AUTH_ERRORS.OTP_EXPIRED_OR_INVALID);
    }
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });
    const resetToken = jsonwebtoken_1.default.sign({ id: user._id, type: "PASSWORD_RESET" }, process.env.JWT_SECRET, { expiresIn: "10m" });
    return resetToken;
};
exports.VerifyOtpAndGenerateResetToken = VerifyOtpAndGenerateResetToken;
const ResetPasswordWithToken = async (resetToken, newPassword) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(resetToken, process.env.JWT_SECRET);
        if (decoded.type !== "PASSWORD_RESET") {
            throw new Error("Invalid Token Purpose");
        }
        const user = await user_1.default.findById(decoded.id);
        if (!user) {
            throw new Error(constants_1.AUTH_ERRORS.USER_NOT_FOUND);
        }
        user.password = newPassword;
        await user.save();
    }
    catch (error) {
        throw new Error(constants_1.AUTH_ERRORS.INVALID_OR_EXPIRED_TOKEN);
    }
};
exports.ResetPasswordWithToken = ResetPasswordWithToken;
const ChangePassword = async (userId, oldPassword, newPassword) => {
    const user = await user_1.default.findById(userId).select("+password");
    if (!user) {
        throw new Error(constants_1.AUTH_ERRORS.USER_NOT_FOUND);
    }
    const isPasswordMatch = await bcrypt_1.default.compare(oldPassword, user.password);
    if (!isPasswordMatch) {
        throw new Error(constants_1.AUTH_ERRORS.WRONG_PASSWORD);
    }
    user.password = newPassword;
    await user.save();
};
exports.ChangePassword = ChangePassword;
// === PROFILE MANAGEMENT ===
const GetUserProfile = async (userId) => {
    const user = await user_1.default.findById(userId).populate("role");
    if (!user || user.isdeleted || user.isdisable) {
        throw new Error(constants_1.AUTH_ERRORS.USER_NOT_FOUND);
    }
    return user;
};
exports.GetUserProfile = GetUserProfile;
const UpdateUserProfile = async (userId, updateData) => {
    const user = await user_1.default.findById(userId);
    if (!user || user.isdeleted || user.isdisable) {
        throw new Error(constants_1.AUTH_ERRORS.USER_NOT_FOUND);
    }
    // Check if email is being changed and if it already exists
    if (updateData.email && updateData.email !== user.email) {
        const existingUser = await user_1.default.findOne({ email: updateData.email });
        if (existingUser && existingUser._id?.toString() !== userId) {
            throw new Error(constants_1.AUTH_ERRORS.EMAIL_ALREADY_EXISTS);
        }
    }
    // Update user fields
    if (updateData.fullname)
        user.fullname = updateData.fullname;
    if (updateData.email)
        user.email = updateData.email;
    if (updateData.phone)
        user.phone = updateData.phone;
    if (updateData.avatar)
        user.avatar = updateData.avatar;
    if (updateData.department)
        user.department = updateData.department;
    if (updateData.position)
        user.position = updateData.position;
    const updatedUser = await user.save();
    return await user_1.default.findById(updatedUser._id).populate("role");
};
exports.UpdateUserProfile = UpdateUserProfile;
const UploadUserAvatar = async (userId, imageBuffer) => {
    const user = await user_1.default.findById(userId);
    if (!user || user.isdeleted || user.isdisable) {
        throw new Error(constants_1.AUTH_ERRORS.USER_NOT_FOUND);
    }
    // Upload to cloudinary
    const avatarUrl = await (0, cloudinary_1.uploadToCloudinary)(imageBuffer, "avatars");
    // Update user avatar
    user.avatar = avatarUrl;
    await user.save();
    return avatarUrl;
};
exports.UploadUserAvatar = UploadUserAvatar;
