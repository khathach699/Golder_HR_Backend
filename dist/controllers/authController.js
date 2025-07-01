"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.uploadAvatar = exports.updateUserProfile = exports.getUserProfile = exports.changePassword = exports.resetPassword = exports.forgotPassword = exports.verifyOtp = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const AuthService = __importStar(require("../services/authService"));
const responseHandler_1 = require("../utils/responseHandler");
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - fullname
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: user1@gmail.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password (minimum 8 characters)
 *                 example: User12345@
 *               fullname:
 *                 type: string
 *                 description: User's full name
 *                 example: user1
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         fullname:
 *                           type: string
 *                         role:
 *                           type: string
 *       400:
 *         description: Bad request
 */
const register = async (req, res) => {
    try {
        const { email, password, fullname } = req.body;
        const role = "user";
        const userData = await AuthService.CreateAnUser(email, password, fullname, role);
        return (0, responseHandler_1.CreateSuccessResponse)(res, 201, {
            user: { id: userData._id, email, fullname, role },
        });
    }
    catch (error) {
        return (0, responseHandler_1.CreateErrorResponse)(res, 400, error.message);
    }
};
exports.register = register;
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập người dùng
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               accountType:
 *                 type: string
 *                 enum: [admin, user]
 *                 description: Chọn loại tài khoản để test nhanh
 *                 example: admin
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Địa chỉ email của người dùng
 *                 example: admin@gmail.com
 *                 enum:
 *                   - admin@gmail.com
 *                   - test@gmail.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Mật khẩu của người dùng
 *                 example: Admin123!
 *                 enum:
 *                   - Admin123!
 *                   - User123!
 *           examples:
 *             admin:
 *               summary: Tài khoản Admin
 *               value:
 *                 accountType: admin
 *                 email: admin@gmail.com
 *                 password: Admin123!
 *             user:
 *               summary: Tài khoản User
 *               value:
 *                 accountType: user
 *                 email: test@gmail.com
 *                 password: Test123!
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     userId:
 *                       type: string
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               description: JWT token được set trong cookie
 *               example: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Path=/; Max-Age=3600
 *       400:
 *         description: Yêu cầu không hợp lệ
 */
const login = async (req, res) => {
    try {
        console.log("Login attempt:", req.body);
        const { email, password } = req.body;
        console.log("Checking login for:", email);
        const user = await AuthService.CheckLogin(email, password);
        console.log("Login successful for user:", user._id);
        const exp = Date.now() + 60 * 60 * 1000; // 1 hour
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });
        (0, responseHandler_1.CreateCookieResponse)(res, "token", token, exp);
        return (0, responseHandler_1.CreateSuccessResponse)(res, 200, { token, user });
    }
    catch (error) {
        console.error("Login error:", error.message);
        return (0, responseHandler_1.CreateErrorResponse)(res, 400, error.message);
    }
};
exports.login = login;
/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP to get a password reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp]
 *             properties:
 *               otp:
 *                 type: string
 *                 description: The 4-digit OTP received via email.
 *                 example: "0000"
 *     responses:
 *       200:
 *         description: OTP verified successfully. Returns a reset token for the next step.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     resetToken:
 *                       type: string
 *                       description: A short-lived token to be used for resetting the password.
 *       400:
 *         description: Invalid or expired OTP.
 */
const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const resetToken = await AuthService.VerifyOtpAndGenerateResetToken(otp);
        return (0, responseHandler_1.CreateSuccessResponse)(res, 200, { resetToken });
    }
    catch (error) {
        return (0, responseHandler_1.CreateErrorResponse)(res, 400, error.message);
    }
};
exports.verifyOtp = verifyOtp;
/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user1@gmail.com
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP sent successfully if email exists.
 *       400:
 *         description: Bad request or email not found.
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        await AuthService.ForgotPassword(email);
        return (0, responseHandler_1.CreateSuccessResponse)(res, 200, {
            message: "If your email is registered, you will receive a password reset OTP.",
        });
    }
    catch (error) {
        return (0, responseHandler_1.CreateErrorResponse)(res, 400, error.message);
    }
};
exports.forgotPassword = forgotPassword;
/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using a reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resetToken, newPassword]
 *             properties:
 *               resetToken:
 *                 type: string
 *                 description: The token received from the /verify-otp endpoint.
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: User12345@
 *                 description: The new password for the user.
 *     responses:
 *       200:
 *         description: Password has been reset successfully.
 *       400:
 *         description: Invalid or expired reset token.
 */
const resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        await AuthService.ResetPasswordWithToken(resetToken, newPassword);
        return (0, responseHandler_1.CreateSuccessResponse)(res, 200, {
            message: "Password has been reset successfully.",
        });
    }
    catch (error) {
        return (0, responseHandler_1.CreateErrorResponse)(res, 400, error.message);
    }
};
exports.resetPassword = resetPassword;
/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password for a logged-in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword]
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 example: User12345@
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 example: User12345@
 *                 format: password
 *     responses:
 *       200:
 *         description: Password changed successfully.
 *       400:
 *         description: Wrong old password or other error.
 *       401:
 *         description: Unauthorized.
 */
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;
        if (!userId) {
            return (0, responseHandler_1.CreateErrorResponse)(res, 401, "Unauthorized: User ID not found in token.");
        }
        await AuthService.ChangePassword(userId, oldPassword, newPassword);
        return (0, responseHandler_1.CreateSuccessResponse)(res, 200, {
            message: "Password changed successfully.",
        });
    }
    catch (error) {
        return (0, responseHandler_1.CreateErrorResponse)(res, 400, error.message);
    }
};
exports.changePassword = changePassword;
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     fullname:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                     role:
 *                       type: object
 *       401:
 *         description: Unauthorized
 */
const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) {
            return (0, responseHandler_1.CreateErrorResponse)(res, 401, "Unauthorized: User ID not found in token.");
        }
        const user = await AuthService.GetUserProfile(userId);
        return (0, responseHandler_1.CreateSuccessResponse)(res, 200, user);
    }
    catch (error) {
        return (0, responseHandler_1.CreateErrorResponse)(res, 400, error.message);
    }
};
exports.getUserProfile = getUserProfile;
/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullname:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { fullname, email, phone, avatar, department, position } = req.body;
        if (!userId) {
            return (0, responseHandler_1.CreateErrorResponse)(res, 401, "Unauthorized: User ID not found in token.");
        }
        const updatedUser = await AuthService.UpdateUserProfile(userId, {
            fullname,
            email,
            phone,
            avatar,
            department,
            position,
        });
        return (0, responseHandler_1.CreateSuccessResponse)(res, 200, updatedUser);
    }
    catch (error) {
        return (0, responseHandler_1.CreateErrorResponse)(res, 400, error.message);
    }
};
exports.updateUserProfile = updateUserProfile;
/**
 * @swagger
 * /api/auth/upload-avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     avatarUrl:
 *                       type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
const uploadAvatar = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) {
            return (0, responseHandler_1.CreateErrorResponse)(res, 401, "Unauthorized: User ID not found in token.");
        }
        if (!req.file) {
            return (0, responseHandler_1.CreateErrorResponse)(res, 400, "No image file provided");
        }
        const avatarUrl = await AuthService.UploadUserAvatar(userId, req.file.buffer);
        return (0, responseHandler_1.CreateSuccessResponse)(res, 200, { avatarUrl });
    }
    catch (error) {
        return (0, responseHandler_1.CreateErrorResponse)(res, 400, error.message);
    }
};
exports.uploadAvatar = uploadAvatar;
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout the user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User logged out successfully by clearing the cookie.
 */
const logout = (req, res) => {
    res.cookie("token", "", {
        httpOnly: true,
        expires: new Date(0),
    });
    return (0, responseHandler_1.CreateSuccessResponse)(res, 200, {
        message: "Logged out successfully",
    });
};
exports.logout = logout;
