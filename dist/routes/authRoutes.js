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
const express_1 = require("express");
const validate_1 = require("../validators/validate");
const AuthController = __importStar(require("../controllers/authController"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const router = (0, express_1.Router)();
// Route cho đăng ký
router.post("/register", validate_1.SignupValidator, validate_1.validate, AuthController.register);
// Route cho đăng nhập
router.post("/login", validate_1.LoginValidator, validate_1.validate, AuthController.login);
// Route cho xác thực OTP
router.post("/verify-otp", AuthController.verifyOtp);
// Route cho quên mật khẩu
router.post("/forgot-password", AuthController.forgotPassword);
// Route cho đặt lại mật khẩu
router.post("/reset-password", AuthController.resetPassword);
// Route lấy danh sách người dùng (chỉ admin)
// Route thay đổi mật khẩu
router.post("/change-password", authMiddleware_1.authenticateToken, AuthController.changePassword);
// Route lấy thông tin profile
router.get("/me", authMiddleware_1.authenticateToken, AuthController.getUserProfile);
// Route cập nhật profile
router.put("/profile", authMiddleware_1.authenticateToken, AuthController.updateUserProfile);
// Route upload avatar
router.post("/upload-avatar", authMiddleware_1.authenticateToken, upload.single("avatar"), AuthController.uploadAvatar);
// Route đăng xuất
router.post("/logout", AuthController.logout);
exports.default = router;
