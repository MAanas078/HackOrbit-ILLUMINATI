import User from "../models/user.model.js";
import generateTokenandSetCookie from "../utils/generateTokenandSetCookie.js";
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendPasswordResetSuccessEmail } from "../services/email.service.js";
import crypto from "crypto";
import bcryptjs from "bcryptjs";
import { AuthValidationService } from "../services/validation.service.js";
import { SecurityService } from "../services/security.service.js";

export class AuthController {
    
    // Signup
    static signup = async (req, res) => {
        const { name, email, password } = req.body;
        
        try {
            // Validation Check
            const validation = AuthValidationService.validateSignup({ name, email, password });
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: validation.errors
                });
            }

            // Check for existing user
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: "User with this email already exists"
                });
            }

            // Generate verification token
            const verificationToken = SecurityService.generateNumericCode();

            // Create User
            const user = new User({
                name: name.trim(),
                email: email.toLowerCase(),
                password,
                verificationToken,
                verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 Hours
                accountStatus: 'pending_verification',
                securitySettings: {
                    passwordLastChanged: new Date(),
                    accountCreatedFrom: req.ip,
                    twoFactorEnabled: false
                }
            });

            await user.save();

            // Send verification email
            try {
                await sendVerificationEmail(user.email, verificationToken, user.name);
            } catch (emailError) {
                console.error("Failed to send verification email:", emailError);
                // Don't fail the signup if email fails, but log it
            }

            // Generate JWT and set cookie
            const token = generateTokenandSetCookie(res, user._id);

            // Log successful signup
            console.log(`New user signup: ${user.email} from IP: ${req.ip}`);

            return res.status(201).json({
                success: true,
                message: "Account created successfully",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    isVerified: user.isVerified,
                    accountStatus: user.accountStatus,
                },
                requiresVerification: true
            });

        } catch (error) {
            console.error("Signup error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error. Please try again later."
            });
        }
    }

    // Verify Email
    static verifyEmail = async (req, res) => {
        try {
            const { code } = req.body;

            if (!code) {
                return res.status(400).json({
                    success: false,
                    message: "Verification code is required"
                });
            }

            const user = await User.findOne({
                verificationToken: code,
                verificationTokenExpiresAt: { $gt: Date.now() },
                accountStatus: 'pending_verification'
            });

            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid or expired verification code"
                });
            }

            // Update user status
            user.isVerified = true;
            user.accountStatus = 'active';
            user.verificationToken = undefined;
            user.verificationTokenExpiresAt = undefined;
            user.emailVerifiedAt = new Date();

            await user.save();

            // Send welcome email
            try {
                await sendWelcomeEmail(user.email, user.name);
            } catch (emailError) {
                console.error("Failed to send welcome email:", emailError);
            }

            res.status(200).json({
                success: true,
                message: "Email verified successfully. Welcome!",
                user: {
                    ...user._doc,
                    password: undefined,
                }
            });

        } catch (error) {
            console.error("Email verification error:", error);
            res.status(500).json({ 
                success: false, 
                message: "Server error during verification" 
            });
        }
    }

    // Login
    static login = async (req, res) => {
        try {
            const { email, password } = req.body;

            // Validation
            const validation = AuthValidationService.validateLogin({ email, password });
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: validation.errors
                });
            }

            // Find user
            const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid credentials"
                });
            }

            // Check password
            const isPasswordValid = await bcryptjs.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid credentials"
                });
            }

            // Generate token and set cookie
            generateTokenandSetCookie(res, user._id);

            // Update last login
            user.lastLogin = new Date();
            user.lastLoginIP = req.ip;
            await user.save();

            res.status(200).json({
                success: true,
                message: "Login successful",
                user: {
                    ...user._doc,
                    password: undefined,
                },
                requiresVerification: !user.isVerified
            });

        } catch (error) {
            console.error("Login error:", error);
            res.status(500).json({ 
                success: false, 
                message: "Internal server error" 
            });
        }
    }

    // Logout
    static logout = async (req, res) => {
        try {
            res.clearCookie("token");
            res.status(200).json({
                success: true,
                message: "Logged out successfully"
            });
        } catch (error) {
            console.error("Logout error:", error);
            return res.status(500).json({
                success: false,
                message: "Error during logout"
            });
        }
    }

    // Forgot Password
    static forgotPassword = async (req, res) => {
        try {
            const { email } = req.body;

            // Email validation
            if (!email || !AuthValidationService.isValidEmail(email)) {
                return res.status(400).json({
                    success: false,
                    message: "Valid email is required"
                });
            }

            const user = await User.findOne({ email: email.toLowerCase() });

            // Don't reveal if user exists or not for security
            if (!user) {
                return res.status(200).json({
                    success: true,
                    message: "If an account with that email exists, a password reset link has been sent."
                });
            }

            // Generate reset token
            const resetToken = SecurityService.generateSecurityToken();
            const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

            user.resetPasswordToken = resetToken;
            user.resetPasswordExpiresAt = resetTokenExpiresAt;
            user.passwordResetRequested = new Date();

            await user.save();

            // Send reset email
            try {
                await sendPasswordResetEmail(user.email, resetToken, user.name);
            } catch (emailError) {
                console.error("Failed to send password reset email:", emailError);
                return res.status(500).json({
                    success: false,
                    message: "Failed to send password reset email. Please try again."
                });
            }

            return res.status(200).json({
                success: true,
                message: "If an account with that email exists, a password reset link has been sent."
            });

        } catch (error) {
            console.error("Forgot password error:", error);
            res.status(500).json({ 
                success: false, 
                message: "Internal server error" 
            });
        }
    }

    // Reset Password
    static resetPassword = async (req, res) => {
        try {
            const { token } = req.params;
            const { password } = req.body;

            if (!token || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Token and new password are required"
                });
            }

            // Validate password strength
            const passwordValidation = AuthValidationService.validatePassword(password);
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: "Password does not meet requirements",
                    errors: passwordValidation.errors
                });
            }

            // Find user with valid reset token
            const user = await User.findOne({
                resetPasswordToken: token,
                resetPasswordExpiresAt: { $gt: Date.now() },
            });

            if (!user) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Invalid or expired reset token" 
                });
            }

            // Update password
            user.password = password;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpiresAt = undefined;
            user.securitySettings.passwordLastChanged = new Date();
            user.passwordResetCompletedAt = new Date();

            await user.save();

            // Send success email
            try {
                await sendPasswordResetSuccessEmail(user.email, user.name);
            } catch (emailError) {
                console.error("Failed to send password reset success email:", emailError);
            }

            return res.status(200).json({
                success: true,
                message: "Password reset successfully"
            });

        } catch (error) {
            console.error("Reset password error:", error);
            res.status(500).json({ 
                success: false, 
                message: "Internal server error" 
            });
        }
    }

    // Check Authentication
    static checkAuth = async (req, res) => {
        try {
            const user = await User.findById(req.userId).select("-password -resetPasswordToken -verificationToken");
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            // Check if account is still active
            if (user.accountStatus !== 'active' && user.accountStatus !== 'pending_verification') {
                return res.status(403).json({
                    success: false,
                    message: "Account access restricted"
                });
            }

            res.status(200).json({
                success: true,
                user
            });
            
        } catch (error) {
            console.error("Auth check error:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    // Resend Verification Email
    static resendVerification = async (req, res) => {
        try {
            const user = await User.findById(req.userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            if (user.isVerified) {
                return res.status(400).json({
                    success: false,
                    message: "Email is already verified"
                });
            }

            // Generate new verification token
            const verificationToken = SecurityService.generateSecureToken();
            user.verificationToken = verificationToken;
            user.verificationTokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000;

            await user.save();

            // Send verification email
            await sendVerificationEmail(user.email, verificationToken, user.name);

            return res.status(200).json({
                success: true,
                message: "Verification email sent successfully"
            });

        } catch (error) {
            console.error("Resend verification error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to send verification email"
            });
        }
    }
}