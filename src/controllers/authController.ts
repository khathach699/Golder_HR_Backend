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