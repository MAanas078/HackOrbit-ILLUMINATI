import nodemailer from 'nodemailer';
import { ConfigConstants } from '../constants/config.constants.js';

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: ConfigConstants.SMTP_HOST,
            port: ConfigConstants.SMTP_PORT,
            secure: ConfigConstants.SMTP_SECURE,
            auth: {
                user: ConfigConstants.SMTP_USER,
                pass: ConfigConstants.SMTP_PASS
            }
        });
    }
    
    async sendEmail({ to, subject, html, text }) {
        try {
            const result = await this.transporter.sendMail({
                from: `"${ConfigConstants.APP_NAME}" <${ConfigConstants.SMTP_FROM}>`,
                to,
                subject,
                html,
                text
            });
            console.log(`Email sent successfully to ${to}`);
            return result;
        } catch (error) {
            console.error(`Failed to send email to ${to}:`, error);
            throw error;
        }
    }
}

const emailService = new EmailService();

export const sendVerificationEmail = async (email, token, name) => {
    const verificationUrl = `${ConfigConstants.FRONTEND_URL}/verify-email?token=${token}`;
    
    const html = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h2>Welcome to ${ConfigConstants.APP_NAME}!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Verify Email Address
                </a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p>This link will expire in 24 hours.</p>
            <hr>
            <p><small>If you didn't create an account, please ignore this email.</small></p>
        </div>
    `;
    
    return emailService.sendEmail({
        to: email,
        subject: `Welcome to ${ConfigConstants.APP_NAME} - Verify Your Email`,
        html,
        text: `Welcome to ${ConfigConstants.APP_NAME}! Please verify your email by visiting: ${verificationUrl}`
    });
};

export const sendWelcomeEmail = async (email, name) => {
    const html = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h2>Welcome to ${ConfigConstants.APP_NAME}! 🎉</h2>
            <p>Hi ${name},</p>
            <p>Your email has been successfully verified! Welcome to our community.</p>
            <p>Here's what you can do next:</p>
            <ul>
                <li>Complete your profile setup</li>
                <li>Explore our features</li>
                <li>Connect with other users</li>
                <li>Start using our platform</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${ConfigConstants.FRONTEND_URL}/dashboard" 
                   style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Get Started
                </a>
            </div>
            <p>Welcome aboard!</p>
            <p>The ${ConfigConstants.APP_NAME} Team</p>
        </div>
    `;
    
    return emailService.sendEmail({
        to: email,
        subject: `Welcome to ${ConfigConstants.APP_NAME} - Let's Get Started!`,
        html,
        text: `Welcome to ${ConfigConstants.APP_NAME}! Your email has been verified. Visit ${ConfigConstants.FRONTEND_URL}/dashboard to get started.`
    });
};

export const sendPasswordResetEmail = async (email, token, name) => {
    const resetUrl = `${ConfigConstants.FRONTEND_URL}/reset-password?token=${token}`;
    
    const html = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h2>Password Reset Request</h2>
            <p>Hi ${name},</p>
            <p>We received a request to reset your password for your ${ConfigConstants.APP_NAME} account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Reset Password
                </a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <hr>
            <p><small>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</small></p>
        </div>
    `;
    
    return emailService.sendEmail({
        to: email,
        subject: `${ConfigConstants.APP_NAME} - Password Reset Request`,
        html,
        text: `Password reset requested for ${ConfigConstants.APP_NAME}. Visit: ${resetUrl}`
    });
};

export const sendPasswordResetSuccessEmail = async (email, name) => {
    const html = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h2>Password Reset Successful</h2>
            <p>Hi ${name},</p>
            <p>Your password has been successfully reset for your ${ConfigConstants.APP_NAME} account.</p>
            <p>If you didn't make this change, please contact our support team immediately.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${ConfigConstants.FRONTEND_URL}/login" 
                   style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Login to Your Account
                </a>
            </div>
            <p>For security, we recommend:</p>
            <ul>
                <li>Using a strong, unique password</li>
                <li>Enabling two-factor authentication</li>
                <li>Keeping your account information up to date</li>
            </ul>
            <p>Stay secure!</p>
            <p>The ${ConfigConstants.APP_NAME} Team</p>
        </div>
    `;
    
    return emailService.sendEmail({
        to: email,
        subject: `${ConfigConstants.APP_NAME} - Password Reset Successful`,
        html,
        text: `Your password has been successfully reset for ${ConfigConstants.APP_NAME}.`
    });
};