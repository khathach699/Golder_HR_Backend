import { Router } from "express";
import {
  validate,
  SignupValidator,
  LoginValidator,
} from "../validators/validate";
import * as AuthController from "../controllers/authController";
import { authenticateToken } from "../middlewares/authMiddleware";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Route cho đăng ký
router.post("/register", SignupValidator, validate, AuthController.register);

// Route cho đăng nhập
router.post("/login", LoginValidator, validate, AuthController.login);

// Route cho xác thực OTP
router.post("/verify-otp", AuthController.verifyOtp);

// Route cho quên mật khẩu
router.post("/forgot-password", AuthController.forgotPassword);

// Route cho đặt lại mật khẩu
router.post("/reset-password", AuthController.resetPassword);

// Route lấy danh sách người dùng (chỉ admin)

// Route thay đổi mật khẩu
router.post(
  "/change-password",
  authenticateToken,
  AuthController.changePassword
);

// Route lấy thông tin profile
router.get("/me", authenticateToken, AuthController.getUserProfile);

// Route cập nhật profile
router.put("/profile", authenticateToken, AuthController.updateUserProfile);

// Route upload avatar
router.post(
  "/upload-avatar",
  authenticateToken,
  upload.single("avatar"),
  AuthController.uploadAvatar
);

// Route đăng xuất
router.post("/logout", AuthController.logout);

export default router;
