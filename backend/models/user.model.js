import mongoose from "mongoose";
import bcrypt from "bcrypt";

const UserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true,
            minlength: 8,
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        lastLogin: {
            type: Date,
            default: Date.now,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        
        // Password Reset
        resetPasswordToken: { type: String, select: false },
        resetPasswordExpiresAt: { type: Date, select: false },
        passwordResetRequested: Date,
        passwordResetCompletedAt: Date,

        // Email Verification
        verificationToken: String,
        verificationTokenExpiresAt: Date,

        // Account Status
        accountStatus: {
            type: String,
            enum: ['pending_verification', 'active', 'suspended', 'deactivated'],
            default: 'pending_verification'
        },
        emailVerifiedAt: Date,

        // Security Tracking
        lastLoginIP: String,
        loginAttempts: { type: Number, default: 0, select: false },
        lockUntil: { type: Date, select: false },

        // Enhanced Security Settings
        securitySettings: {
            passwordLastChanged: { type: Date, default: Date.now },
            twoFactorEnabled: { type: Boolean, default: false },
            twoFactorSecret: { type: String, select: false },
            accountCreatedFrom: String,
            loginNotifications: { type: Boolean, default: true }
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform: function(doc, ret) {
                delete ret.password;
                delete ret.resetPasswordToken;
                delete ret.verificationToken;
                delete ret.loginAttempts;
                delete ret.lockUntil;
                return ret;
            }
        }
    }
);

// Hash Password before saving
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ verificationToken: 1 });
UserSchema.index({ resetPasswordToken: 1 });
UserSchema.index({ accountStatus: 1 });
UserSchema.index({ 'securitySettings.passwordLastChanged': 1 });

const User = mongoose.model("User", UserSchema);

export default User;