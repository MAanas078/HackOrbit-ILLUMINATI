import dotenv from "dotenv";

dotenv.config();

export class ConfigConstants {
    //Server Configurations
    static PORT = process.env.PORT || 8000;
    static NODE_ENV = process.env.NODE_ENV || "development"
    static APP_NAME = process.env.APP_NAME || "ResourceX";

    //Database
    static MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/resource';

    //JWT
    static JWT_SECRET = process.env.JWT_SECRET
    static JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

    // Frontend URL
    static FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Email Configuration
    static SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
    static SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;
    static SMTP_SECURE = process.env.SMTP_SECURE === 'true';
    static SMTP_USER = process.env.SMTP_USER;
    static SMTP_PASS = process.env.SMTP_PASS;
    static SMTP_FROM = process.env.SMTP_FROM || process.env.SMTP_USER;

    // Rate Limiting
    static RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000; // 15 minutes
    static RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
    
    // Security
    static BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    static SESSION_SECRET = process.env.SESSION_SECRET;
    
    // File Upload
    static MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB
    static UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

        
    // Validation
    static validateRequired() {
        const required = [
            'JWT_SECRET',
            'SMTP_USER',
            'SMTP_PASS'
        ];
        
        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
        
    }
}