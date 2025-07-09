import express from "express"
import { verifyToken } from "../middleware/verifyToken.js";
import { AuthController } from "../controllers/auth.controller.js";

const authRouter = express.Router();

//Public Routes
authRouter.post("/signup", AuthController.signup);
authRouter.post("/login", AuthController.login);
authRouter.post("/verify-email", AuthController.verifyEmail);
authRouter.post("/forgot-password", AuthController.forgotPassword);
authRouter.post("/reset-password/:token", AuthController.resetPassword);

//Protected Routes
authRouter.get("/check-auth", verifyToken, AuthController.checkAuth);
authRouter.post("/logout", AuthController.logout);
authRouter.post("/resend-verification", verifyToken, AuthController.resendVerification);

export default authRouter;