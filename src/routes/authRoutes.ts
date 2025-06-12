import { Router } from "express";
import { register, login } from "../controllers/authController";
import { validate, SignupValidator, LoginValidator } from "../validators/validate";

const router = Router();

router.post("/register", SignupValidator, validate, register);
router.post("/login", LoginValidator, validate, login);

export default router;