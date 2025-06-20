import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import * as AuthService from "../services/authService";
import {
  CreateSuccessResponse,
  CreateErrorResponse,
  CreateCookieResponse,
} from "../utils/responseHandler";
import User from "../models/user";
import { AUTH_ERRORS } from "../utils/constants";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

interface RegisterRequestBody {
  email: string;
  password: string;
  fullname: string;
}

interface LoginRequestBody {
  email: string;
  password: string;
}

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
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, fullname } = req.body as RegisterRequestBody;
    const role = "user";
    const userData = await AuthService.CreateAnUser(
      email,
      password,
      fullname,
      role
    );
    return CreateSuccessResponse(res, 201, {
      user: { id: userData._id, email, fullname, role },
    });
  } catch (error: any) {
    return CreateErrorResponse(res, 400, error.message);
  }
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
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
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: user1@gmail.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *                 example: User12345@
 *     responses:
 *       200:
 *         description: User logged in successfully
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
 *               description: JWT token set in cookie
 *               example: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Path=/; Max-Age=3600
 *       400:
 *         description: Bad request
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequestBody;
    const userId = await AuthService.CheckLogin(email, password);
    const exp = Date.now() + 60 * 60 * 1000; // 1 hour
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET!, {
      expiresIn: "1h",
    });
    CreateCookieResponse(res, "token", token, exp);
    return CreateSuccessResponse(res, 200, { token, userId });
  } catch (error: any) {
    return CreateErrorResponse(res, 400, error.message);
  }
};

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
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { otp } = req.body;
    const resetToken = await AuthService.VerifyOtpAndGenerateResetToken(otp);
    return CreateSuccessResponse(res, 200, { resetToken });
  } catch (error: any) {
    return CreateErrorResponse(res, 400, error.message);
  }
};

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
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    await AuthService.ForgotPassword(email);
    return CreateSuccessResponse(res, 200, {
      message:
        "If your email is registered, you will receive a password reset OTP.",
    });
  } catch (error: any) {
    return CreateErrorResponse(res, 400, error.message);
  }
};

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
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { resetToken, newPassword } = req.body;
    await AuthService.ResetPasswordWithToken(resetToken, newPassword);
    return CreateSuccessResponse(res, 200, {
      message: "Password has been reset successfully.",
    });
  } catch (error: any) {
    return CreateErrorResponse(res, 400, error.message);
  }
};

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
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { oldPassword, newPassword } = req.body;

    if (!userId) {
      return CreateErrorResponse(
        res,
        401,
        "Unauthorized: User ID not found in token."
      );
    }

    await AuthService.ChangePassword(userId, oldPassword, newPassword);
    return CreateSuccessResponse(res, 200, {
      message: "Password changed successfully.",
    });
  } catch (error: any) {
    return CreateErrorResponse(res, 400, error.message);
  }
};

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
export const logout = (req: Request, res: Response) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  return CreateSuccessResponse(res, 200, {
    message: "Logged out successfully",
  });
};

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: Get list of active users for dropdown (Admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       fullname:
 *                         type: string
 *                       email:
 *                         type: string
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const getUsersForDropdown = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ isdeleted: false, isdisable: false })
      .select("fullname email")
      .lean();
    return CreateSuccessResponse(
      res,
      200,
      users.map((user) => ({
        id: user._id.toString(),
        fullname: user.fullname,
        email: user.email,
      }))
    );
  } catch (error: any) {
    return CreateErrorResponse(res, 500, error.message);
  }
};

/**
 * @swagger
 * /api/auth/upload-face/{userId}:
 *   post:
 *     summary: Upload employee's face image (Admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the employee selected from the dropdown
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Face image file
 *     responses:
 *       200:
 *         description: Face image uploaded successfully
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
 *                     imageUrl:
 *                       type: string
 *       400:
 *         description: Bad request
 *       403:
 *         description: Unauthorized
 */
export const uploadEmployeeFace = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!req.file) {
      return CreateErrorResponse(res, 400, "No image file provided");
    }
    const user = await User.findById(userId);
    if (!user || user.isdeleted || user.isdisable) {
      return CreateErrorResponse(res, 400, AUTH_ERRORS.USER_NOT_FOUND);
    }
    const imageUrl = await AuthService.UploadEmployeeFace(
      userId,
      req.file.buffer
    );
    return CreateSuccessResponse(res, 200, {
      imageUrl,
      user: { id: user._id, fullname: user.fullname, email: user.email },
    });
  } catch (error: any) {
    return CreateErrorResponse(res, 400, error.message);
  }
};
