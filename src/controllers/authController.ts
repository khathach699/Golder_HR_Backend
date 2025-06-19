import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { CreateAnUser, CheckLogin } from "../services/authService";
import { CreateSuccessResponse, CreateErrorResponse, CreateCookieResponse } from "../utils/responseHandler";

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
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password (minimum 8 characters)
 *                 example: Password123@
 *               fullname:
 *                 type: string
 *                 description: User's full name
 *                 example: John Doe
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, fullname } = req.body as RegisterRequestBody;
    const role = "user";
    const userData = await CreateAnUser(email, password, fullname, role);
    return CreateSuccessResponse(res, 201, { user: { id: userData._id, email, fullname, role } });
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
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *                 example: Password123@
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequestBody;
    const userId = await CheckLogin(email, password);
    const exp = Date.now() + 60 * 60 * 1000; // 1 hour
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET!, { expiresIn: "1h" });
    CreateCookieResponse(res, "token", token, exp);
    return CreateSuccessResponse(res, 200, { token, userId });
  } catch (error: any) {
    return CreateErrorResponse(res, 400, error.message);
  }
};