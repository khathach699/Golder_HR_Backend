import { Router } from "express";
import { validate, SignupValidator, LoginValidator } from "../validators/validate";
import * as AuthController from "../controllers/authController";
// Sửa lại dòng import này:
import { check_authentication } from "../middlewares/authMiddleware"; 

const router = Router();


router.post("/register", SignupValidator, validate, AuthController.register);
router.post("/login", LoginValidator, validate, AuthController.login);
router.post("/verify-otp", AuthController.verifyOtp);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);



router.post(
    "/change-password",
    check_authentication, 
    AuthController.changePassword
);


export default router;